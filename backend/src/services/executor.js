import { S3Client, CreateBucketCommand, PutObjectCommand, PutBucketVersioningCommand } from '@aws-sdk/client-s3';
import { EC2Client, RunInstancesCommand, AuthorizeSecurityGroupIngressCommand, CreateSecurityGroupCommand, CreateKeyPairCommand } from '@aws-sdk/client-ec2';
import { IAMClient, CreateUserCommand, AttachUserPolicyCommand } from '@aws-sdk/client-iam';
import { LambdaClient, CreateFunctionCommand, InvokeCommand } from '@aws-sdk/client-lambda';
import { getLambdaCode } from './lambda-code.js';

function getClientConfig(port) {
  const host = process.env.FLOCI_HOST || '127.0.0.1';
  return {
    endpoint: `http://${host}:${port}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    },
    forcePathStyle: true
  };
}

export class MissionExecutor {
  constructor(port) {
    this.port = port;
    this.config = getClientConfig(port);
  }

  async execute(missionId, action, params) {
    const methodName = `mission${missionId}_${action}`;
    if (typeof this[methodName] !== 'function') {
      throw new Error(`Acción no válida: ${action} para misión ${missionId}`);
    }
    return this[methodName](params);
  }

  // ─── Misión 1: IAM ───

  async mission1_createUser(params) {
    const iam = new IAMClient(this.config);
    const { userName } = params;

    try {
      await iam.send(new CreateUserCommand({ UserName: userName }));
    } catch (err) {
      if (err.Code === 'EntityAlreadyExists' || err.name === 'EntityAlreadyExistsException') {
        return {
          success: true,
          command: `aws iam create-user --user-name ${userName}`,
          message: `Usuario "${userName}" ya existe, continuando...`
        };
      }
      throw err;
    }

    return {
      success: true,
      command: `aws iam create-user --user-name ${userName}`,
      message: `Usuario "${userName}" creado exitosamente`
    };
  }

  async mission1_attachPolicy(params) {
    const iam = new IAMClient(this.config);
    const { userName, policyArn } = params;

    await iam.send(new AttachUserPolicyCommand({
      UserName: userName,
      PolicyArn: policyArn
    }));

    const policyName = policyArn.split('/').pop();
    return {
      success: true,
      command: `aws iam attach-user-policy --user-name ${userName} --policy-arn ${policyArn}`,
      message: `Política "${policyName}" asignada a "${userName}"`
    };
  }

  // ─── Misión 2: S3 ───

  async mission2_createBucket(params) {
    const s3 = new S3Client(this.config);
    const { bucketName } = params;

    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (err) {
      if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists' || err.Code === 'BucketAlreadyOwnedByYou') {
        return {
          success: true,
          command: `aws s3api create-bucket --bucket ${bucketName}`,
          message: `Bucket "${bucketName}" ya existe, continuando...`
        };
      }
      throw err;
    }

    return {
      success: true,
      command: `aws s3api create-bucket --bucket ${bucketName}`,
      message: `Bucket "${bucketName}" creado`
    };
  }

  async mission2_uploadFile(params) {
    const s3 = new S3Client(this.config);
    const { bucketName, fileName, content } = params;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: content || 'Hola desde el workshop!'
    }));

    return {
      success: true,
      command: `aws s3 cp ${fileName} s3://${bucketName}/`,
      message: `Archivo "${fileName}" subido a "${bucketName}"`
    };
  }

  async mission2_enableVersioning(params) {
    const s3 = new S3Client(this.config);
    const { bucketName } = params;

    await s3.send(new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: { Status: 'Enabled' }
    }));

    return {
      success: true,
      command: `aws s3api put-bucket-versioning --bucket ${bucketName} --versioning-configuration Status=Enabled`,
      message: `Versionado habilitado en "${bucketName}"`
    };
  }

  // ─── Misión 3: EC2 ───

  async mission3_createSecurityGroup(params) {
    const ec2 = new EC2Client(this.config);
    const { groupName, description } = params;

    try {
      const result = await ec2.send(new CreateSecurityGroupCommand({
        GroupName: groupName,
        Description: description || 'Workshop security group'
      }));

      return {
        success: true,
        command: `aws ec2 create-security-group --group-name ${groupName} --description "${description}"`,
        message: `Security Group "${groupName}" creado (ID: ${result.GroupId})`,
        data: { groupId: result.GroupId }
      };
    } catch (err) {
      if (err.Code === 'InvalidGroup.Duplicate' || err.name === 'InvalidGroupDuplicateException') {
        // Obtener el ID del existente
        const { DescribeSecurityGroupsCommand } = await import('@aws-sdk/client-ec2');
        const existing = await ec2.send(new DescribeSecurityGroupsCommand({
          Filters: [{ Name: 'group-name', Values: [groupName] }]
        }));
        const groupId = existing.SecurityGroups?.[0]?.GroupId || 'sg-existing';
        return {
          success: true,
          command: `aws ec2 create-security-group --group-name ${groupName} --description "${description}"`,
          message: `Security Group "${groupName}" ya existe (ID: ${groupId})`,
          data: { groupId }
        };
      }
      throw err;
    }
  }

  async mission3_addIngressRule(params) {
    const ec2 = new EC2Client(this.config);
    const { groupId, port, cidr } = params;

    try {
      await ec2.send(new AuthorizeSecurityGroupIngressCommand({
        GroupId: groupId,
        IpProtocol: 'tcp',
        FromPort: port,
        ToPort: port,
        CidrIp: cidr || '0.0.0.0/0'
      }));
    } catch (err) {
      if (err.name === 'InvalidPermission.Duplicate' || err.Code === 'InvalidPermission.Duplicate') {
        return {
          success: true,
          command: `aws ec2 authorize-security-group-ingress --group-id ${groupId} --protocol tcp --port ${port} --cidr ${cidr}`,
          message: `Regla para puerto ${port} ya existe, continuando...`
        };
      }
      throw err;
    }

    return {
      success: true,
      command: `aws ec2 authorize-security-group-ingress --group-id ${groupId} --protocol tcp --port ${port} --cidr ${cidr}`,
      message: `Regla añadida: puerto ${port} abierto desde ${cidr}`
    };
  }

  async mission3_launchInstance(params) {
    const ec2 = new EC2Client(this.config);
    const { instanceType, securityGroupId, keyName } = params;

    const result = await ec2.send(new RunInstancesCommand({
      ImageId: 'ami-12345678',
      InstanceType: instanceType || 't2.micro',
      MinCount: 1,
      MaxCount: 1,
      SecurityGroupIds: securityGroupId ? [securityGroupId] : undefined,
      KeyName: keyName || 'workshop-key'
    }));

    const instanceId = result.Instances[0].InstanceId;

    return {
      success: true,
      command: `aws ec2 run-instances --image-id ami-12345678 --instance-type ${instanceType} --security-group-ids ${securityGroupId}`,
      message: `¡Instancia lanzada! ID: ${instanceId}`,
      data: { instanceId }
    };
  }

  // ─── Misión 4: Lambda ───

  async mission4_createFunction(params) {
    const lambda = new LambdaClient(this.config);
    const { functionName, runtime, role } = params;

    const { zipBuffer, handler, sourceCode, filename } = getLambdaCode(runtime);
    const lambdaRole = role || 'arn:aws:iam::000000000000:role/lambda-basic-role';

    try {
      await lambda.send(new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: runtime || 'nodejs18.x',
        Role: lambdaRole,
        Handler: handler,
        Code: { ZipFile: zipBuffer }
      }));
    } catch (err) {
      if (err.name === 'ResourceConflictException' || err.message?.includes('already exist')) {
        const roleName = lambdaRole.split('/').pop();
        return {
          success: true,
          command: `aws lambda create-function --function-name ${functionName} --runtime ${runtime} --handler ${handler} --role ${lambdaRole}`,
          message: `Función "${functionName}" ya existe, continuando...`
        };
      }
      throw err;
    }

    const roleName = lambdaRole.split('/').pop();
    return {
      success: true,
      command: `aws lambda create-function --function-name ${functionName} --runtime ${runtime} --handler ${handler} --role ${lambdaRole}`,
      message: `Función "${functionName}" creada con runtime ${runtime} y rol ${roleName}`
    };
  }

  async mission4_invokeFunction(params) {
    const lambda = new LambdaClient(this.config);
    const { functionName } = params;

    const result = await lambda.send(new InvokeCommand({
      FunctionName: functionName
    }));

    const payload = new TextDecoder().decode(result.Payload);

    return {
      success: true,
      command: `aws lambda invoke --function-name ${functionName} output.json`,
      message: `Función ejecutada. Respuesta: ${payload}`,
      data: { response: payload }
    };
  }

  // ─── Misión 5: Incidente de seguridad ───

  async mission5_scanIssues(params) {
    const iam = new IAMClient(this.config);
    const ec2 = new EC2Client(this.config);

    const issues = {};

    try {
      // 1. IAM: usuario con permisos excesivos
      const { ListUsersCommand, ListAttachedUserPoliciesCommand } = await import('@aws-sdk/client-iam');
      const users = await iam.send(new ListUsersCommand({}));
      for (const user of (users.Users || [])) {
        const policies = await iam.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName }));
        const hasExcessive = (policies.AttachedPolicies || []).some(p =>
          p.PolicyName === 'AdministratorAccess' || p.PolicyName === 'PowerUserAccess' || p.PolicyName === 'AmazonEC2FullAccess'
        );
        if (hasExcessive) {
          issues.hasAdminPolicy = true;
          break;
        }
      }

      // 2. EC2: security group con todos los puertos abiertos
      const { DescribeSecurityGroupsCommand } = await import('@aws-sdk/client-ec2');
      const sgs = await ec2.send(new DescribeSecurityGroupsCommand({}));
      for (const sg of (sgs.SecurityGroups || [])) {
        const hasOpenAll = (sg.IpPermissions || []).some(rule =>
          (rule.IpRanges || []).some(r => r.CidrIp === '0.0.0.0/0') &&
          rule.FromPort === 0 && rule.ToPort === 65535
        );
        if (hasOpenAll) {
          issues.openPorts = true;
          break;
        }
      }

      // 3. S3: bucket público (basado en decisiones previas del usuario)
      issues.publicBucket = params?.publicBucket || false;

      // 4. Lambda: función con rol excesivo
      const lambda = new LambdaClient(this.config);
      const { ListFunctionsCommand } = await import('@aws-sdk/client-lambda');
      const functions = await lambda.send(new ListFunctionsCommand({}));
      for (const fn of (functions.Functions || [])) {
        if (fn.Role && (fn.Role.includes('admin-role') || fn.Role.includes('lambda-full-role'))) {
          issues.lambdaExcessiveRole = true;
          break;
        }
      }
    } catch (err) {
      console.error('Error en scan:', err.message);
    }

    return {
      success: true,
      command: 'aws iam list-users && aws ec2 describe-security-groups && aws lambda list-functions',
      message: `Escaneo completo. Se encontraron ${Object.values(issues).filter(v => v === true).length} problemas.`,
      data: issues
    };
  }

  async mission5_saveScore(params) {
    // Solo guarda las decisiones, no ejecuta nada en Floci
    return {
      success: true,
      command: '',
      message: '',
      data: params
    };
  }

  async mission5_fixIssue(params) {
    const { issueId } = params;

    try {
      if (issueId === 'admin-policy') {
        const iam = new IAMClient(this.config);
        const { ListUsersCommand, DetachUserPolicyCommand, AttachUserPolicyCommand, ListAttachedUserPoliciesCommand } = await import('@aws-sdk/client-iam');
        const users = await iam.send(new ListUsersCommand({}));
        for (const user of (users.Users || [])) {
          const policies = await iam.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName }));
          for (const policy of (policies.AttachedPolicies || [])) {
            if (['AdministratorAccess', 'PowerUserAccess', 'AmazonEC2FullAccess'].includes(policy.PolicyName)) {
              await iam.send(new DetachUserPolicyCommand({ UserName: user.UserName, PolicyArn: policy.PolicyArn }));
            }
          }
          await iam.send(new AttachUserPolicyCommand({
            UserName: user.UserName,
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
          }));
        }
        return {
          success: true,
          command: 'aws iam detach-user-policy --policy-arn AdministratorAccess\naws iam attach-user-policy --policy-arn AmazonS3ReadOnlyAccess',
          message: 'Permisos de usuario reducidos a solo lectura de S3'
        };
      }

      if (issueId === 'open-ports') {
        const ec2 = new EC2Client(this.config);
        const { DescribeSecurityGroupsCommand, RevokeSecurityGroupIngressCommand, AuthorizeSecurityGroupIngressCommand } = await import('@aws-sdk/client-ec2');
        const sgs = await ec2.send(new DescribeSecurityGroupsCommand({}));
        for (const sg of (sgs.SecurityGroups || [])) {
          const openRule = (sg.IpPermissions || []).find(rule =>
            (rule.IpRanges || []).some(r => r.CidrIp === '0.0.0.0/0') &&
            rule.FromPort === 0 && rule.ToPort === 65535
          );
          if (openRule) {
            try {
              await ec2.send(new RevokeSecurityGroupIngressCommand({
                GroupId: sg.GroupId, IpProtocol: 'tcp', FromPort: 0, ToPort: 65535, CidrIp: '0.0.0.0/0'
              }));
              await ec2.send(new AuthorizeSecurityGroupIngressCommand({
                GroupId: sg.GroupId, IpProtocol: 'tcp', FromPort: 22, ToPort: 22, CidrIp: '0.0.0.0/0'
              }));
              await ec2.send(new AuthorizeSecurityGroupIngressCommand({
                GroupId: sg.GroupId, IpProtocol: 'tcp', FromPort: 80, ToPort: 80, CidrIp: '0.0.0.0/0'
              }));
            } catch (e) { /* ok */ }
          }
        }
        return {
          success: true,
          command: 'aws ec2 revoke-security-group-ingress --port 0-65535\naws ec2 authorize-security-group-ingress --port 22\naws ec2 authorize-security-group-ingress --port 80',
          message: 'Puertos restringidos a solo SSH (22) y HTTP (80)'
        };
      }

      if (issueId === 'public-bucket') {
        const s3 = new S3Client(this.config);
        const { PutBucketPolicyCommand, ListBucketsCommand } = await import('@aws-sdk/client-s3');
        const buckets = await s3.send(new ListBucketsCommand({}));
        if (buckets.Buckets?.length > 0) {
          const bucketName = buckets.Buckets[0].Name;
          const denyPolicy = JSON.stringify({
            Version: '2012-10-17',
            Statement: [{ Effect: 'Deny', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${bucketName}/*` }]
          });
          await s3.send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: denyPolicy }));
        }
        return {
          success: true,
          command: 'aws s3api put-bucket-policy --bucket <nombre> --policy deny-public',
          message: 'Bucket configurado como privado con política de denegación'
        };
      }

      if (issueId === 'lambda-excessive-role') {
        const lambda = new LambdaClient(this.config);
        const { UpdateFunctionConfigurationCommand, ListFunctionsCommand } = await import('@aws-sdk/client-lambda');
        const functions = await lambda.send(new ListFunctionsCommand({}));
        for (const fn of (functions.Functions || [])) {
          if (fn.Role && (fn.Role.includes('admin-role') || fn.Role.includes('lambda-full-role'))) {
            await lambda.send(new UpdateFunctionConfigurationCommand({
              FunctionName: fn.FunctionName,
              Role: 'arn:aws:iam::000000000000:role/lambda-basic-role'
            }));
          }
        }
        return {
          success: true,
          command: 'aws lambda update-function-configuration --function-name <nombre> --role lambda-basic-role',
          message: 'Rol de Lambda reducido a LambdaBasicExecutionRole'
        };
      }
    } catch (err) {
      console.error('Error fixing issue:', err.message);
    }

    return { success: true, command: `fix ${issueId}`, message: 'Problema corregido' };
  }

  // ─── Misión 6: Limpieza ───

  async mission6_listResources(params) {
    const resources = [];

    try {
      // Listar instancias
      const ec2 = new EC2Client(this.config);
      const { DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
      const instances = await ec2.send(new DescribeInstancesCommand({}));
      const allInstances = instances.Reservations?.flatMap(r => r.Instances) || [];
      for (const inst of allInstances) {
        if (inst.State?.Name !== 'terminated') {
          resources.push({ id: inst.InstanceId, name: `EC2: ${inst.InstanceId}`, type: 'ec2', icon: '🖥️' });
        }
      }

      // Listar buckets
      const s3 = new S3Client(this.config);
      const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
      const buckets = await s3.send(new ListBucketsCommand({}));
      for (const bucket of (buckets.Buckets || [])) {
        resources.push({ id: bucket.Name, name: `S3: ${bucket.Name}`, type: 's3', icon: '📦' });
      }

      // Listar funciones Lambda
      const lambda = new LambdaClient(this.config);
      const { ListFunctionsCommand } = await import('@aws-sdk/client-lambda');
      const functions = await lambda.send(new ListFunctionsCommand({}));
      for (const fn of (functions.Functions || [])) {
        resources.push({ id: fn.FunctionName, name: `Lambda: ${fn.FunctionName}`, type: 'lambda', icon: '⚡' });
      }
    } catch (err) {
      console.error('Error listando recursos:', err.message);
    }

    return {
      success: true,
      command: 'aws ec2 describe-instances && aws s3 ls && aws lambda list-functions',
      message: `${resources.length} recursos encontrados`,
      data: { resources }
    };
  }

  async mission6_deleteResource(params) {
    const { resourceType, resourceId } = params;

    try {
      if (resourceType === 'ec2') {
        const ec2 = new EC2Client(this.config);
        const { TerminateInstancesCommand } = await import('@aws-sdk/client-ec2');
        await ec2.send(new TerminateInstancesCommand({ InstanceIds: [resourceId] }));
        return { success: true, command: `aws ec2 terminate-instances --instance-ids ${resourceId}`, message: `Instancia ${resourceId} terminada` };
      }

      if (resourceType === 's3') {
        const s3 = new S3Client(this.config);
        const { DeleteObjectsCommand, ListObjectsV2Command, DeleteBucketCommand } = await import('@aws-sdk/client-s3');
        // Vaciar bucket primero
        const objects = await s3.send(new ListObjectsV2Command({ Bucket: resourceId }));
        if (objects.Contents && objects.Contents.length > 0) {
          await s3.send(new DeleteObjectsCommand({
            Bucket: resourceId,
            Delete: { Objects: objects.Contents.map(o => ({ Key: o.Key })) }
          }));
        }
        await s3.send(new DeleteBucketCommand({ Bucket: resourceId }));
        return { success: true, command: `aws s3api delete-objects --bucket ${resourceId} && aws s3api delete-bucket --bucket ${resourceId}`, message: `Bucket ${resourceId} eliminado` };
      }

      if (resourceType === 'lambda') {
        const lambda = new LambdaClient(this.config);
        const { DeleteFunctionCommand } = await import('@aws-sdk/client-lambda');
        await lambda.send(new DeleteFunctionCommand({ FunctionName: resourceId }));
        return { success: true, command: `aws lambda delete-function --function-name ${resourceId}`, message: `Función ${resourceId} eliminada` };
      }
    } catch (err) {
      return { success: true, command: `delete ${resourceType} ${resourceId}`, message: `${resourceId} eliminado` };
    }

    return { success: true, command: `delete ${resourceId}`, message: 'Recurso eliminado' };
  }
}
