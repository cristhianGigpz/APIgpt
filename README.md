# APIgpt

APIgpt es un servicio backend construido con **Node.js** y **Express** que permite interactuar con la API de OpenAI para generar contenido **en formato JSON** siguiendo un esquema específico.  
El sistema está protegido con autenticación por token, control de solicitudes y configuraciones de seguridad como CORS y limitación de peticiones.

## 🚀 Características

- Procesa mensajes enviados por el cliente y devuelve un JSON estructurado.
- Autenticación mediante **Bearer Token**.
- Control de acceso por **CORS**.
- Limitación de solicitudes por minuto (**rate limit**).
- Prevención de caché en las respuestas.
- Resúmenes automáticos de hasta **10 párrafos** en el campo `descrip`.

## 📦 Instalación

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/tuusuario/APIgpt.git
   cd APIgpt

   ```

2. Instalar dependencias:
   npm install

3. Crear un archivo .env en la raíz del proyecto con las siguientes variables:
   PORT=4000
   OPENAI_API_KEY=tu_api_key_de_openai
   API_SECRET_TOKEN_KEY=tu_token_secreto_para_autenticacion
   MODEL_NAME=gpt-4.1-mini

4. Iniciar el servidor:
   npm start
