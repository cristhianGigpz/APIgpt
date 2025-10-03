import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

// --- Configurar trust proxy para Render ---
app.set("trust proxy", 1);

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
              text: 'Debes responder únicamente en formato JSON utilizando la siguiente estructura, sin agregar ningún texto adicional fuera del bloque JSON. Toda la información solicitada o noticia deberás entregarla siempre como un resumen de máximo 10 párrafos, ubicado obligatoriamente en el campo "descrip" del objeto. Nunca incluyas información completa, solo resúmenes. Si no tienes datos suficientes, completa los campos con una cadena vacía o una lista vacía según corresponda. No uses comentarios ni formato adicional. \n\nNOTA: si te escribo en español contestas en español, si es en ingles respondes en ingles. \n \nReemplaza los siguientes valores de los campos con la información correspondiente:  \n- descrip: resumen de la noticia o información solicitada (NUNCA mayor a 10 párrafos) \n- title: título principal para la información solicitada  \n- path: título corto, separado por guiones ("-") \n- page: número de pagina pedido o solicitado, si no ese especifica "SIEMPRE SERA 1"\n- classSection: formato, tamaño, medida o dimensiones del post o informacion solicitada: yx1 xy1 hasta yx12 xy12 No puede ser mayor a 12x12 si se pide uno mayor ejemplo 13x10 se usara 5x1 \n  ejemplo: si se solicita la informacion en formato 5x2 seria: yx5 xy2, si no se especifica el formato o se pide uno invalido siempre se usara: yx5 xy1 \n  los otros valores en el campo classSection como: item, titular, redSocial no deben cambiar nunca, siempre deben ser agregados con esos valores: resultando: "item [formato] titular redSocial" \nSi la información recibida tiene más de 10 párrafos, reduce y sintetiza el contenido para cumplir esta restricción. No expliques ni incluyas introducciones, resultados, ni justificaciones fuera del campo "descrip". \n \nJSON response format (example):\n\n{\n  "classSection": "item [formato pedido, ej. yx5 xy1] titular redSocial",\n  "dateCreate": "",\n  "descrip": "[Síntesis máxima de la noticia o información solicitada: solo los datos más relevantes en hasta 10 párrafos. Si no hay datos, dejar vacío.]",\n  "owner": "",\n  "page": [pagina solicitada sino 1],\n  "path": "[titulo-corto-separado-por-guiones]",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "[Título principal]",\n  "userId": ""\n}\n\n# Output Format \n \nResponde siempre usando SOLO el bloque JSON especificado. El campo "descrip" debe contener un resumen de máximo 10 párrafos y toda la información relevante solicitada; nunca incluyas respuestas completas, comentarios, ni información adicional fuera del JSON. \n \n# Notes \n \n- Es obligatorio que cualquier respuesta se entregue como un resumen (máximo 10 párrafos) y esté EXCLUSIVAMENTE en el campo "descrip". \n- Si la información original es más extensa, resumir estrictamente hasta 10 párrafos. \n- No agregues justificaciones, explicaciones adicionales ni ningún texto fuera del JSON. \n- Si alguna información solicitada no está disponible, utiliza una cadena vacía para ese campo. \n- Deja los otros campos con su valor por defecto, solo cambia lo solicitado \n- Sigue la estructura JSON estrictamente. \n \nRecuerda: debes entregar siempre únicamente un resumen en el campo "descrip" de máximo 10 párrafos y no responder fuera del bloque JSON.\n\n# Ejemplos \n \nEjemplo 1: \nSolicitud: "Dame un resumen sobre la vida de Marie Curie" \n{ \n  "classSection": "item yx5 xy1 titular redSocial", \n  "dateCreate": "", \n  "descrip": "Marie Curie fue una pionera en el campo de la radiactividad. Nació en Polonia en 1867 y realizó sus estudios en París. Curie fue la primera persona en recibir dos premios Nobel en diferentes ciencias. Descubrió los elementos polonio y radio junto a su esposo Pierre Curie. Su trabajo revolucionó la física y la medicina, permitiendo avances en el tratamiento del cáncer. Enfrentó desafíos como mujer en la ciencia, pero nunca se detuvo. Es reconocida como una de las científicas más influyentes del siglo XX. Su legado persiste en la investigación científica y la igualdad de género en la ciencia.", \n  "owner": "", \n  "page": 1, \n  "path": "marie-curie", \n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb", \n  "sombra": false, \n  "title": "Resumen sobre la vida de Marie Curie", \n  "userId": "" \n} \n \n\nEjemplo 2: \nSolicitud: "Resumen en formato 5x2 sobre la Segunda Guerra Mundial" \n{ \n  "classSection": "item yx5 xy2 titular redSocial", \n  "dateCreate": "", \n  "descrip": "La Segunda Guerra Mundial fue un conflicto global que duró de 1939 a 1945. Involucró a la mayoría de las naciones del mundo, incluyendo las grandes potencias en dos alianzas militares opuestas: los Aliados y las Potencias del Eje. Comenzó con la invasión de Polonia por Alemania, liderada por Adolf Hitler. El conflicto resultó en cambios significativos en las fronteras de Europa y Asia, y causó decenas de millones de víctimas. La guerra finalizó con la rendición de Alemania en mayo de 1945 y de Japón en septiembre tras los bombardeos atómicos de Hiroshima y Nagasaki. Las consecuencias incluyeron la fundación de la ONU, el inicio de la Guerra Fría y grandes avances tecnológicos y sociales.", \n  "owner": "", \n  "page": 1, \n  "path": "segunda-guerra-mundial", \n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb", \n  "sombra": false, \n  "title": "Resumen Segunda Guerra Mundial", \n  "userId": "" \n} \n\nEjemplo 3:\nSolicitud: "cuenta la historia del inca atahualpa en formato 5x2 para la pagina 2" \n{\n  "classSection": "item yx5 xy2 titular redSocial",\n  "dateCreate": "",\n  "descrip": "Atahualpa fue el último emperador inca antes de la conquista española. Nació alrededor de 1502 y fue hijo del emperador Huayna Cápac. Tras la muerte de su padre, se desató una guerra civil entre Atahualpa y su hermano Huáscar por el control del Imperio Inca. Atahualpa logró vencer y consolidar su poder en la región norte del imperio. En 1532, fue capturado por el conquistador español Francisco Pizarro en Cajamarca mediante una emboscada. Durante su cautiverio, Atahualpa ofreció un cuantioso rescate en oro y plata por su liberación. A pesar del pago del rescate, fue acusado de traición y ejecutado en 1533. Su muerte marcó el fin del dominio incaico y facilitó la colonización española en Sudamérica. La figura de Atahualpa se ha convertido en un símbolo de resistencia indígena y la tragedia de la conquista. Su legado sigue presente en la cultura andina y la historia latinoamericana.",\n  "owner": "",\n  "page": 2,\n  "path": "historia-inca-atahualpa",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Historia del Inca Atahualpa",\n  "userId": ""\n}',
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
              text: '{\n  "classSection": "item yx5 xy1 titular redSocial",\n  "dateCreate": "",\n  "descrip": "Agencia EFE por Agencia EFE 5 de Agosto del 2025 4:00 PM · Actualizado el 5 de Agosto del 2025 4:44 PM El presidente de Colombia afirmó en su cuenta en X que el Perú , afirmó Petro, que confirmó así que esta celebración no se hará en el departamento de Boyacá, lugar en el que suele realizarse, ni en Bogotá, donde había informado el lunes el Ejército que se llevaría a cabo.",\n  "owner": "",\n  "page": 1,\n  "path": "gustavo-petro-dice-que-el-gobierno-peruano-ha-copado-un-territorio-que-es-de-colombia",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Gustavo Petro dice que el gobierno peruano \'ha copado un territorio que es de Colombia\'",\n  "userId": "",\n}',
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
              text: '{\n  "classSection": "item yx5 xy1 titular redSocial",\n  "dateCreate": "",\n  "descrip": "La Revolución Francesa fue un movimiento social y político que comenzó en 1789 y transformó profundamente a Francia. Se originó por la crisis económica, desigualdades sociales y la influencia de ideas ilustradas. El pueblo francés, especialmente la burguesía y el campesinado, se rebeló contra la monarquía absoluta y el sistema feudal. En 1789 se convocó a los Estados Generales, que derivaron en la formación de la Asamblea Nacional y la Declaración de los Derechos del Hombre y del Ciudadano, proclamando libertades y la igualdad ante la ley. La toma de la Bastilla el 14 de julio de 1789 simbolizó el inicio de la revolución popular. Durante los años siguientes, se abolieron los privilegios nobiliarios y se instauró la república. La Revolución enfrentó violencia y conflictos internos, destacándose el Reinado del Terror bajo Robespierre. Finalmente, en 1799, Napoleón Bonaparte tomó el poder, cerrando esta etapa y dando inicio a una nueva fase en la historia francesa. La Revolución Francesa influyó en toda Europa y sentó las bases de la modernidad política y social.",\n  "owner": "",\n  "page": 1,\n  "path": "revolucion-francesa",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Explicación de la Revolución Francesa",\n  "userId": ""\n}',
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
