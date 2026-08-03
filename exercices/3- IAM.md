# ═══ IAM: Permisos y seguridad ═══

# Crear usuario
aws iam create-user --user-name desarrollador

# Crear grupo
aws iam create-group --group-name equipo-dev

# Agregar usuario al grupo
aws iam add-user-to-group \
  --user-name desarrollador \
  --group-name equipo-dev

# Verificar
aws iam list-users
aws iam list-groups
aws iam get-group --group-name equipo-dev

# Crear política: solo lectura de S3
cat > policy-s3-read.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::*",
        "arn:aws:s3:::*/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name S3ReadOnly \
  --policy-document file://policy-s3-read.json

# Adjuntar política al grupo
POLICY_ARN="arn:aws:iam::000000000000:policy/S3ReadOnly"
aws iam attach-group-policy \
  --group-name equipo-dev \
  --policy-arn $POLICY_ARN

# Verificar políticas del grupo
aws iam list-attached-group-policies --group-name equipo-dev

# Crear trust policy para Lambda
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear role para Lambda
aws iam create-role \
  --role-name lambda-s3-role \
  --assume-role-policy-document file://trust-policy.json

# Dar permisos de S3 al role
aws iam attach-role-policy \
  --role-name lambda-s3-role \
  --policy-arn $POLICY_ARN

# Verificar role
aws iam get-role --role-name lambda-s3-role
