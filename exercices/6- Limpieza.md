# ═══ LIMPIEZA: Eliminar todo ═══

#EC2
# Primero obtén el ID del SG existente
SG_ID=$(aws ec2 describe-security-groups \
  --group-names workshop-sg \
  --query 'SecurityGroups[0].GroupId' --output text)

# Borrar security group
aws ec2 delete-security-group --group-id $SG_ID

# Terminar instancia (eliminar)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Lambda
aws lambda delete-function --function-name hola-workshop
aws lambda delete-function --function-name procesador

# S3
aws s3 rb s3://empresa-workshop --force

# IAM
POLICY_ARN="arn:aws:iam::000000000000:policy/S3ReadOnly"
aws iam detach-group-policy --group-name equipo-dev --policy-arn $POLICY_ARN
aws iam detach-role-policy --role-name lambda-s3-role --policy-arn $POLICY_ARN
aws iam delete-policy --policy-arn $POLICY_ARN
aws iam delete-role --role-name lambda-s3-role
aws iam remove-user-from-group --user-name desarrollador --group-name equipo-dev
aws iam delete-user --user-name desarrollador
aws iam delete-group --group-name equipo-dev

# Docker
docker compose down

# Archivos temporales
rm -f *.txt *.json *.zip *.mjs *.pem response.json result.json
rm -rf proyecto docs-locales
