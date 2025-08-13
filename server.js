import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.use(
  cors({
    origin: ["https://gigpz.com"],
    methods: ["POST"],
  })
);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1,
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde." },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use("/v1/completions", limiter);

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ error: "No se proporcionó token de autenticación" });
  }
  if (token !== process.env.API_SECRET_TOKEN_KEY) {
    return res.status(403).json({ error: "Token de autenticación inválido" });
  }
  next();
}
// Ruta POST /testgpt/v1 que recibe un mensaje y responde con OpenAI

app.post("/v1/completions", authenticateToken, async (req, res) => {
  try {
    const { userMessage } = req.body;

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim().length === 0
    ) {
      return res.status(400).json({ error: "Parámetro userMessage inválido" });
    }
    if (userMessage.length > 1000) {
      return res.status(400).json({ error: "userMessage demasiado largo" });
    }

    if (!userMessage) {
      return res.status(400).json({ error: "Falta el parámetro userMessage" });
    }

    const response = await openai.chat.completions.create({
      model: process.env.MODEL_NAME,
      //model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: 'Debes responder únicamente en formato JSON utilizando la siguiente estructura, sin agregar ningún texto adicional fuera del bloque JSON. Toda la información solicitada o noticia deberás entregarla siempre como un resumen de máximo 10 párrafos, ubicado obligatoriamente en el campo "descrip" del objeto. Nunca incluyas información completa, solo resúmenes. Si no tienes datos suficientes, completa los campos con una cadena vacía o una lista vacía según corresponda. No uses comentarios ni formato adicional. \r\n\r\nReemplaza los siguientes valores de los campos con la información correspondiente: \r\n- descrip: resumen de la noticia o información solicitada (NUNCA mayor a 10 párrafos)\r\n- title: título principal para la información solicitada \r\n- path: título corto, separado por guiones ("-")\r\n- classSection: formato, tamaño, medida o dimensiones del post o informacion solicitada: yx1 xy1 hasta yx12 xy12 No puede ser mayor a 12x12 si se pide uno mayor ejemplo 13x10 se usara 5x1\r\n  ejemplo: si se solicita la informacion en formato 5x2 seria: yx5 xy2, si no se especifica el formato o se pide uno invalido siempre se usara: yx5 xy1\r\n  los otros valores en el campo classSection como: item, titular, redSocial no deben cambiar nunca, siempre deben ser agregados con esos valores: resultando: "item [formato] titular redSocial"\r\nSi la información recibida tiene más de 10 párrafos, reduce y sintetiza el contenido para cumplir esta restricción. No expliques ni incluyas introducciones, resultados, ni justificaciones fuera del campo "descrip".\r\n\r\nJSON response format (example):\r\n\r\n{\r\n "border": {\r\n    "bottom": "0px solid #1c1c1c",\r\n    "top": "0px solid #1c1c1c",\r\n    "left": "0px solid #1c1c1c",\r\n    "right": "0px solid #1c1c1c"\r\n  },\r\n  "cat": "default",\r\n  "classImg": "roundin",\r\n  "classPost": "post post-y", \r\n  "classSection": "item [Aquí formato pedido, ejemplo yx5 xy1] titular redSocial",\r\n  "color": "#ffffff",\r\n  "dateCreate": "", \r\n  "descrip": "[Aquí un resumen de máximo 10 párrafos sobre la noticia o información solicitada, redactado de forma clara y completa según los datos disponibles. Si no hay datos suficientes, este campo debe quedar vacío.]",\r\n  "destacar": false,\r\n  "estado": true,\r\n  "fuenteContent": "system-ui",\r\n  "fuenteTitle": "system-ui",\r\n  "full": true,\r\n  "interactive": false,\r\n  "italic": false,\r\n  "link": "",\r\n  "name": "",\r\n  "owner": "",\r\n  "padding": 4,\r\n  "page": 1,\r\n  "path": "[titulo-corto-separado-por-guiones]",\r\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\r\n  "pimg": 47,\r\n  "ptxt": 47,\r\n  "rotate": "0",\r\n  "share": false,\r\n  "sombra": false,\r\n  "textColor": "#000000",\r\n  "title": "[Título principal]",\r\n  "tituloColor": "#000000",\r\n  "tituloSize": "20",\r\n  "type": "",\r\n  "userId": "",\r\n  "visibility": "public",\r\n  "xyfont": "16"\r\n}\r\n\r\n# Output Format\r\n\r\nResponde siempre usando SOLO el bloque JSON especificado. El campo "descrip" debe contener un resumen de máximo 10 párrafos y toda la información relevante solicitada; nunca incluyas respuestas completas, comentarios, ni información adicional fuera del JSON.\r\n\r\n# Notes\r\n\r\n- Es obligatorio que cualquier respuesta se entregue como un resumen (máximo 10 párrafos) y esté EXCLUSIVAMENTE en el campo "descrip".\r\n- Si la información original es más extensa, resumir estrictamente hasta 10 párrafos.\r\n- No agregues justificaciones, explicaciones adicionales ni ningún texto fuera del JSON.\r\n- Si alguna información solicitada no está disponible, utiliza una cadena vacía para ese campo.\r\n- Deja los otros campos con su valor por defecto, solo cambia lo solicitado\r\n- Sigue la estructura JSON estrictamente.\r\n\r\nRecuerda: debes entregar siempre únicamente un resumen en el campo "descrip" de máximo 10 párrafos y no responder fuera del bloque JSON.',
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "genera en formato json la noticia o información solicitada",
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: '{\n  "border": {\n    "bottom": "0px solid #1c1c1c",\n    "top": "0px solid #1c1c1c",\n    "left": "0px solid #1c1c1c",\n    "right": "0px solid #1c1c1c"\n  },\n  "cat": "default",\n  "classImg": "roundin",\n  "classPost": "post post-y",\n  "classSection": "item yx5 xy1 titular redSocial",\n  "color": "#ffffff",\n  "dateCreate": "",\n  "descrip": "Agencia EFE por Agencia EFE 5 de Agosto del 2025 4:00 PM · Actualizado el 5 de Agosto del 2025 4:44 PM El presidente de Colombia afirmó en su cuenta en X que el Perú , afirmó Petro, que confirmó así que esta celebración no se hará en el departamento de Boyacá, lugar en el que suele realizarse, ni en Bogotá, donde había informado el lunes el Ejército que se llevaría a cabo.",\n  "destacar": false,\n  "estado": true,\n  "fuenteContent": "system-ui",\n  "fuenteTitle": "system-ui",\n  "full": true,\n  "interactive": false,\n  "italic": false,\n  "link": "",\n  "name": "",\n  "owner": "",\n  "padding": 4,\n  "page": 1,\n  "path": "gustavo-petro-dice-que-el-gobierno-peruano-ha-copado-un-territorio-que-es-de-colombia",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "pimg": 47,\n  "ptxt": 47,\n  "rotate": "0",\n  "share": false,\n  "sombra": false,\n  "textColor": "#000000",\n  "title": "Gustavo Petro dice que el gobierno peruano \'ha copado un territorio que es de Colombia\'",\n  "tituloColor": "#000000",\n  "tituloSize": "20",\n  "type": "",\n  "userId": "",\n  "visibility": "public",\n  "xyfont": "16"\n}',
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${userMessage}`,
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: '{\n  "border": {\n    "bottom": "0px solid #1c1c1c",\n    "top": "0px solid #1c1c1c",\n    "left": "0px solid #1c1c1c",\n    "right": "0px solid #1c1c1c"\n  },\n  "cat": "default",\n  "classImg": "roundin",\n  "classPost": "post post-y",\n  "classSection": "item yx5 xy1 titular redSocial",\n  "color": "#ffffff",\n  "dateCreate": "",\n  "descrip": "Paraguay, ubicado en el corazón de América del Sur, tiene una historia marcada por la colonización española, su independencia y posteriores conflictos regionales. Originalmente habitado por pueblos indígenas guaraníes, la región fue explorada por españoles en el siglo XVI, estableciendo la ciudad de Asunción en 1537, que se convertiría en un importante centro colonial. Durante la época colonial, Paraguay fue parte del Virreinato del Río de la Plata y desarrolló una sociedad mestiza con fuerte influencia guaraní.\\n\\nEl 14 de mayo de 1811, Paraguay proclamó su independencia de España, iniciando un proceso de consolidación nacional bajo la dirección de figuras como José Gaspar Rodríguez de Francia, quien gobernó con un régimen autocrático y aislacionista durante gran parte del siglo XIX. Este periodo buscó fortalecer la autonomía del país frente a sus vecinos.\\n\\nEn 1864 comenzó la Guerra de la Triple Alianza, un conflicto devastador contra Argentina, Brasil y Uruguay, que terminó en 1870 con la casi total destrucción de Paraguay, pérdida de territorio y una dramática reducción de su población.\\n\\nA finales del siglo XIX y durante el siglo XX, Paraguay experimentó periodos de inestabilidad política y dictaduras, pero también avances en infraestructura y economía. En 1932 estalló la Guerra del Chaco contra Bolivia, conflicto que finalizó en 1935 con la victoria paraguaya y la ampliación de su territorio en la región del Chaco Boreal.\\n\\nEn 1954, Alfredo Stroessner inició una dictadura que duró más de tres décadas, marcada por la represión y el control autoritario, hasta su derrocamiento en 1989, que abrió paso a la transición hacia la democracia.\\n\\nDesde entonces, Paraguay ha trabajado en fortalecer sus instituciones y economía, enfrentando desafíos como la desigualdad social y la corrupción, mientras mantiene su rica cultura guaraní y mestiza como base de su identidad nacional.",\n  "destacar": false,\n  "estado": true,\n  "fuenteContent": "system-ui",\n  "fuenteTitle": "system-ui",\n  "full": true,\n  "interactive": false,\n  "italic": false,\n  "link": "",\n  "name": "",\n  "owner": "",\n  "padding": 4,\n  "page": 1,\n  "path": "historia-de-paraguay",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "pimg": 47,\n  "ptxt": 47,\n  "rotate": "0",\n  "share": false,\n  "sombra": false,\n  "textColor": "#000000",\n  "title": "Historia de Paraguay",\n  "tituloColor": "#000000",\n  "tituloSize": "20",\n  "type": "",\n  "userId": "",\n  "visibility": "public",\n  "xyfont": "16"\n}',
            },
          ],
        },
      ],
      response_format: {
        type: "text",
      },
      tools: [],
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Envía la respuesta del modelo al cliente

    const resposeText = response.choices[0].message.content;
    //const obj = JSON.parse(resposeText);
    let obj;
    try {
      obj = JSON.parse(resposeText);
    } catch {
      return res.status(500).json({ error: "Respuesta inválida del modelo" });
    }
    res.setHeader("Cache-Control", "no-store"); // evitar cache
    //res.setHeader("Expires", "0");
    res.json({ result: obj });
  } catch (error) {
    console.error("Error al llamar a OpenAI:", error);
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "Tiempo de espera agotado" });
    }
    res
      .status(500)
      .json({ error: error.message || "Error interno del servidor" });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
