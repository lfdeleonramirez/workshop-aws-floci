# ═══ Lambda: Funciones serverless ═══

# Función básica: saludar
cat > index.mjs << 'EOF'
export const handler = async (event) => {
  const nombre = event.nombre || "Mundo";
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      mensaje: `¡Hola ${nombre}! 🚀`,
      timestamp: new Date().toISOString(),
      region: process.env.AWS_REGION
    })
  };
};
EOF

# Empaquetar
zip function.zip index.mjs

# Crear función
aws lambda create-function \
  --function-name hola-workshop \
  --runtime nodejs20.x \
  --role arn:aws:iam::000000000000:role/lambda-s3-role \
  --handler index.handler \
  --zip-file fileb://function.zip

# Invocar con payload
aws lambda invoke \
  --function-name hola-workshop \
  --payload '{"nombre": "Workshop AWS"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json

# Invocar sin payload (usa default)
aws lambda invoke \
  --function-name hola-workshop \
  response.json && cat response.json

# Función procesador de datos
cat > procesador.mjs << 'EOF'
export const handler = async (event) => {
  const { productos } = event;
  
  if (!productos || !productos.length) {
    return { error: "Envía un array de productos" };
  }
  
  const total = productos.reduce((sum, p) => sum + p.precio, 0);
  const promedio = total / productos.length;
  const caro = productos.reduce((max, p) => 
    p.precio > max.precio ? p : max
  );
  
  return {
    totalProductos: productos.length,
    sumaPrecios: total,
    precioPromedio: promedio.toFixed(2),
    productoMasCaro: caro.nombre,
    procesadoEn: new Date().toISOString()
  };
};
EOF

zip procesador.zip procesador.mjs

aws lambda create-function \
  --function-name procesador \
  --runtime nodejs20.x \
  --role arn:aws:iam::000000000000:role/lambda-s3-role \
  --handler procesador.handler \
  --zip-file fileb://procesador.zip

# Invocar con datos
aws lambda invoke \
  --function-name procesador \
  --payload '{
    "productos": [
      {"nombre": "Laptop", "precio": 25999},
      {"nombre": "Mouse", "precio": 599},
      {"nombre": "Monitor", "precio": 8499},
      {"nombre": "Teclado", "precio": 1299}
    ]
  }' \
  --cli-binary-format raw-in-base64-out \
  result.json

cat result.json

# Listar funciones
aws lambda list-functions \
  --query 'Functions[].{Nombre:FunctionName,Runtime:Runtime}' \
  --output table
