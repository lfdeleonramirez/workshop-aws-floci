import { S3Client, ListBucketsCommand, GetBucketVersioningCommand } from '@aws-sdk/client-s3';
import { EC2Client, DescribeInstancesCommand, DescribeSecurityGroupsCommand } from '@aws-sdk/client-ec2';
import { IAMClient, ListUsersCommand, ListAttachedUserPoliciesCommand } from '@aws-sdk/client-iam';
import { LambdaClient, ListFunctionsCommand, InvokeCommand } from '@aws-sdk/client-lambda';
import { getMissionScoring, getMissionValidation } from './missions-loader.js';

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

// Helper: esperar N ms
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: reintentar una función async hasta que pase o se agoten los intentos
export async function withRetry(fn, { retries = 3, delay = 1500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await fn();
    if (result.passed || attempt === retries) return result;
    await sleep(delay);
  }
}

export class Validator {
  constructor(port) {
    this.port = port;
    this.config = getClientConfig(port);
  }

  // Misión 1: IAM
  async validateMission1(decisions) {
    const iam = new IAMClient(this.config);
    const scoring = getMissionScoring(1);
    const validation = getMissionValidation(1);
    const result = { passed: false, details: {}, score: 0 };

    try {
      // Verificar que creó un usuario
      const users = await iam.send(new ListUsersCommand({}));
      const createdUser = users.Users?.find(u => u.UserName !== 'admin');

      if (!createdUser) {
        result.details.userCreated = false;
        return result;
      }
      result.details.userCreated = true;

      // Verificar qué política le asignó
      const policies = await iam.send(new ListAttachedUserPoliciesCommand({
        UserName: createdUser.UserName
      }));

      const attachedPolicies = policies.AttachedPolicies || [];
      const excessivePolicies = validation?.excessivePolicies || ['AdministratorAccess'];
      const hasExcessive = attachedPolicies.some(p =>
        excessivePolicies.includes(p.PolicyName)
      );

      result.details.hasAdminPolicy = hasExcessive;
      result.details.isLeastPrivilege = !hasExcessive && attachedPolicies.length > 0;
      result.passed = true;

      // Puntuación desde config
      if (result.details.isLeastPrivilege) {
        result.score = scoring?.leastPrivilege ?? 150;
      } else {
        result.score = scoring?.excessivePermissions ?? 50;
      }
    } catch (err) {
      result.details.error = err.message;
    }

    return result;
  }

  // Misión 2: S3
  async validateMission2(decisions) {
    const s3 = new S3Client(this.config);
    const scoring = getMissionScoring(2);
    const result = { passed: false, details: {}, score: 0 };

    try {
      // Verificar que creó un bucket
      const buckets = await s3.send(new ListBucketsCommand({}));

      if (!buckets.Buckets || buckets.Buckets.length === 0) {
        result.details.bucketCreated = false;
        return result;
      }
      result.details.bucketCreated = true;

      const bucketName = buckets.Buckets[0].Name;

      // Verificar versionado
      const versioning = await s3.send(new GetBucketVersioningCommand({
        Bucket: bucketName
      }));

      result.details.versioningEnabled = versioning.Status === 'Enabled';
      result.details.isPrivate = decisions?.isPrivate !== false;
      result.passed = true;

      // Puntuación desde config
      let score = scoring?.base ?? 100;
      if (result.details.versioningEnabled) score += scoring?.versioningBonus ?? 25;
      if (result.details.isPrivate) score += scoring?.privateBonus ?? 25;
      result.score = score;
    } catch (err) {
      result.details.error = err.message;
    }

    return result;
  }

  // Misión 3: EC2
  async validateMission3(decisions) {
    const ec2 = new EC2Client(this.config);
    const scoring = getMissionScoring(3);
    const validation = getMissionValidation(3);
    const result = { passed: false, details: {}, score: 0 };

    try {
      // Verificar instancia creada
      const instances = await ec2.send(new DescribeInstancesCommand({}));
      const allInstances = instances.Reservations?.flatMap(r => r.Instances) || [];
      // Aceptar cualquier instancia que exista (LocalStack puede reportar distintos estados)
      const createdInstances = allInstances.filter(i =>
        i.State?.Name && i.State.Name !== 'shutting-down'
      );

      if (createdInstances.length === 0) {
        result.details.instanceCreated = false;
        return result;
      }
      result.details.instanceCreated = true;
      result.details.instanceType = createdInstances[0].InstanceType;

      // Verificar security groups
      const sgIds = createdInstances[0].SecurityGroups?.map(sg => sg.GroupId) || [];
      if (sgIds.length > 0) {
        const sgs = await ec2.send(new DescribeSecurityGroupsCommand({
          GroupIds: sgIds
        }));

        const openCheck = validation?.openAllCheck || { cidr: '0.0.0.0/0', fromPort: 0, toPort: 65535 };
        const hasOpenAll = sgs.SecurityGroups?.some(sg =>
          sg.IpPermissions?.some(rule =>
            rule.IpRanges?.some(range => range.CidrIp === openCheck.cidr) &&
            rule.FromPort === openCheck.fromPort && rule.ToPort === openCheck.toPort
          )
        );

        result.details.securityGroupOpen = hasOpenAll || false;
      }

      result.passed = true;

      // Puntuación desde config
      if (!result.details.securityGroupOpen) {
        result.score = scoring?.secureConfig ?? 150;
      } else {
        result.score = scoring?.openAllPorts ?? 50;
      }
    } catch (err) {
      result.details.error = err.message;
    }

    return result;
  }

  // Misión 4: Lambda
  async validateMission4(decisions) {
    const lambda = new LambdaClient(this.config);
    const scoring = getMissionScoring(4);
    const result = { passed: false, details: {}, score: 0 };

    try {
      const functions = await lambda.send(new ListFunctionsCommand({}));

      if (!functions.Functions || functions.Functions.length === 0) {
        result.details.functionCreated = false;
        return result;
      }

      result.details.functionCreated = true;
      result.details.functionName = functions.Functions[0].FunctionName;
      result.details.runtime = functions.Functions[0].Runtime;

      // Intentar invocar
      try {
        const invokeResult = await lambda.send(new InvokeCommand({
          FunctionName: functions.Functions[0].FunctionName
        }));
        result.details.invocationSuccess = invokeResult.StatusCode === 200;
      } catch {
        result.details.invocationSuccess = false;
      }

      result.passed = true;
      result.score = result.details.invocationSuccess
        ? (scoring?.functionCreatedAndInvoked ?? 150)
        : (scoring?.functionCreatedOnly ?? 100);
    } catch (err) {
      result.details.error = err.message;
    }

    return result;
  }

  // Misión 5: Auditoría de seguridad
  async validateMission5(previousDecisions) {
    const scoring = getMissionScoring(5);
    const result = { passed: false, details: {}, score: 0 };

    const answeredCorrectly = previousDecisions.correctAnswers || 0;
    const answeredIncorrectly = previousDecisions.incorrectAnswers || 0;
    const totalIssues = previousDecisions.totalIssues || 0;

    result.details.totalIssues = totalIssues;
    result.details.correctAnswers = answeredCorrectly;
    result.details.incorrectAnswers = answeredIncorrectly;

    // Puntuación desde config
    const correctPoints = scoring?.correctAnswer ?? 40;
    const penaltyPoints = Math.abs(scoring?.incorrectPenalty ?? -20);
    result.score = (answeredCorrectly * correctPoints) - (answeredIncorrectly * penaltyPoints);
    if (result.score < 0) result.score = 0;

    result.passed = true;
    return result;
  }

  // Misión 6: Limpieza
  async validateMission6(decisions) {
    const scoring = getMissionScoring(6);
    const result = { passed: false, details: {}, score: 0 };

    try {
      const ec2 = new EC2Client(this.config);
      const instances = await ec2.send(new DescribeInstancesCommand({}));
      const activeInstances = (instances.Reservations?.flatMap(r => r.Instances) || [])
        .filter(i => i.State?.Name !== 'terminated');

      const s3 = new S3Client(this.config);
      const buckets = await s3.send(new ListBucketsCommand({}));

      const lambda = new LambdaClient(this.config);
      const functions = await lambda.send(new ListFunctionsCommand({}));

      const remainingResources = activeInstances.length +
        (buckets.Buckets?.length || 0) +
        (functions.Functions?.length || 0);

      result.details.remainingResources = remainingResources;
      result.details.instances = activeInstances.length;
      result.details.buckets = buckets.Buckets?.length || 0;
      result.details.functions = functions.Functions?.length || 0;

      if (remainingResources === 0) {
        result.score = scoring?.perfectCleanup ?? 150;
        result.passed = true;
      } else if (remainingResources <= 1) {
        result.score = scoring?.oneRemaining ?? 100;
        result.passed = true;
      } else {
        result.score = scoring?.multipleRemaining ?? 50;
        result.passed = true;
      }
    } catch (err) {
      result.details.error = err.message;
      result.passed = true;
      result.score = scoring?.oneRemaining ?? 100;
    }

    return result;
  }
}
