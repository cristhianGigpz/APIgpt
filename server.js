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
              text: 'Responde únicamente con un bloque JSON siguiendo estrictamente la estructura que se indica. Sintetiza y optimiza al máximo la información solicitada o la noticia — nunca excedas los 10 párrafos en el campo "descrip", ni incluyas detalles innecesarios. No agregues nada fuera del JSON ni incluyas explicaciones, justificaciones, notas, ni comentarios adicionales. Si hay campos sin datos suficientes, reemplázalos por una cadena vacía o una lista vacía según corresponda. \n\nAsegúrate de:\n- Resumir toda la información solicitada en un máximo de 10 párrafos, colocándola ÚNICAMENTE en el campo "descrip".\n- No presentar la información completa ni fragmentos extensos; siempre sintetiza y resume rigurosamente.\n- Utilizar la siguiente estructura y formato JSON sin variaciones.\n- Para el campo "classSection", aplica la lógica de formato especificada para tamaño/dimensiones. Si no se indica formato válido, usa siempre: yx5 xy1. El formato debe ir antecedido y seguido por las palabras "item", "titular" y "redSocial" en ese orden.\n- No modifiques los otros valores por defecto excepto los solicitados.\n- Nunca incluyas texto fuera del JSON ni uses comentarios.\n\n# Pasos\n\n1. Analiza la información solicitada o la noticia.\n2. Sintetízala tan eficientemente como sea posible, garantizando el resumen en 10 párrafos como máximo, solo en "descrip".\n3. Completa los otros campos según los valores solicitados y las reglas.\n4. Revisa que el bloque JSON sea la única salida, sin líneas previas ni posteriores fuera del bloque.\n\n# Formato de salida\n\nLa respuesta debe consistir exclusivamente en un único bloque JSON, usando la siguiente estructura y cumpliendo las reglas descritas:\n\n{\n  "classSection": "item [formato pedido, ej. yx5 xy1] titular redSocial",\n  "dateCreate": "",\n  "descrip": "[Síntesis máxima de la noticia o información solicitada: solo los datos más relevantes en hasta 10 párrafos. Si no hay datos, dejar vacío.]",\n  "owner": "",\n  "page": 1,\n  "path": "[titulo-corto-separado-por-guiones]",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "[Título principal]",\n  "userId": ""\n}\n\n# Ejemplos\n\nEjemplo 1:\nSolicitud: "Dame un resumen sobre la vida de Marie Curie"\n{\n  "classSection": "item yx5 xy1 titular redSocial",\n  "dateCreate": "",\n  "descrip": "Marie Curie fue una pionera en el campo de la radiactividad. Nació en Polonia en 1867 y realizó sus estudios en París. Curie fue la primera persona en recibir dos premios Nobel en diferentes ciencias. Descubrió los elementos polonio y radio junto a su esposo Pierre Curie. Su trabajo revolucionó la física y la medicina, permitiendo avances en el tratamiento del cáncer. Enfrentó desafíos como mujer en la ciencia, pero nunca se detuvo. Es reconocida como una de las científicas más influyentes del siglo XX. Su legado persiste en la investigación científica y la igualdad de género en la ciencia.",\n  "owner": "",\n  "page": 1,\n  "path": "marie-curie",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Resumen sobre la vida de Marie Curie",\n  "userId": ""\n}\n\nEjemplo 2:\nSolicitud: "Resumen en formato 5x2 sobre la Segunda Guerra Mundial"\n{\n  "classSection": "item yx5 xy2 titular redSocial",\n  "dateCreate": "",\n  "descrip": "La Segunda Guerra Mundial fue un conflicto global que duró de 1939 a 1945. Involucró a la mayoría de las naciones del mundo, incluyendo las grandes potencias en dos alianzas militares opuestas: los Aliados y las Potencias del Eje. Comenzó con la invasión de Polonia por Alemania, liderada por Adolf Hitler. El conflicto resultó en cambios significativos en las fronteras de Europa y Asia, y causó decenas de millones de víctimas. La guerra finalizó con la rendición de Alemania en mayo de 1945 y de Japón en septiembre tras los bombardeos atómicos de Hiroshima y Nagasaki. Las consecuencias incluyeron la fundación de la ONU, el inicio de la Guerra Fría y grandes avances tecnológicos y sociales.",\n  "owner": "",\n  "page": 1,\n  "path": "segunda-guerra-mundial",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Resumen Segunda Guerra Mundial",\n  "userId": ""\n}\n\nEjemplo 3:\nSolicitud: "Resumen en formato 13x10 sobre la historia de Internet"\n{\n  "classSection": "item yx5 xy1 titular redSocial",\n  "dateCreate": "",\n  "descrip": "Internet surgió en la década de 1960 como un proyecto militar en Estados Unidos. En los años 80, se expandió a universidades y luego al público general. El desarrollo de la World Wide Web en 1991 facilitó su uso global. Ha revolucionado la comunicación, la educación y los negocios, permitiendo la aparición de redes sociales y nuevas formas de trabajo. Hoy en día, Internet conecta a miles de millones de personas y dispositivos en todo el mundo.",\n  "owner": "",\n  "page": 1,\n  "path": "historia-de-internet",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Resumen historia de Internet",\n  "userId": ""\n}\n\nNota: Los ejemplos podrán requerir respuestas más largas o cortas dependiendo de la información original, pero nunca deben tener más de 10 párrafos en "descrip", ni incluir nada fuera del bloque JSON.\n\n# Notas\n\n- Resumir y optimizar la información es OBLIGATORIO.\n- No agregar nada fuera del bloque JSON ni justificar la información presentada.\n- Seguir la estructura y lógica de formato para "classSection" según el pedido; si no se especifica o es inválido, usar yx5 xy1.\n- Solo usar cadenas vacías o listas vacías si no hay datos disponibles.\n- La consigna principal: máxima síntesis y claridad, en un único bloque JSON con la estructura indicada.',
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
              text: '{\n  "classSection": "item yx5 xy1 titular redSocial",\n  "dateCreate": "",\n  "descrip": "Los Mundiales de Fútbol comenzaron en 1930 en Uruguay, siendo la primera competición internacional organizada por la FIFA. Desde entonces, se realizan cada cuatro años, excepto durante la Segunda Guerra Mundial. Inicialmente contaban con pocos equipos, pero con el tiempo se expandieron para incluir selecciones de todo el mundo. Brasil es el país con más títulos, con un total de cinco campeonatos. El torneo ha sido escenario de grandes figuras y momentos históricos que han marcado la historia del deporte. La Copa Mundial ha evolucionado en formato, tecnología y alcance, convirtiéndose en el evento deportivo más visto globalmente. La competición fomenta la unión cultural y la pasión por el fútbol en todas las naciones participantes. Actualmente, el Mundial incluye una fase de clasificación, fases de grupos y eliminatorias directas. Además del torneo masculino, la FIFA organiza también el Mundial femenino, que ha crecido en popularidad y competitividad. El Mundial de Fútbol sigue siendo un símbolo de excelencia deportiva y rivalidad sana a nivel global.",\n  "owner": "",\n  "page": 1,\n  "path": "historia-de-los-mundiales-de-futbol",\n  "picture": "https://firebasestorage.googleapis.com/v0/b/gigpz-74324.appspot.com/o/defaults%2Flogo.svg?alt=media&token=844cc2fa-1c58-42fe-8947-b0f78caa1dcb",\n  "sombra": false,\n  "title": "Historia de los Mundiales de Fútbol",\n  "userId": ""\n}',
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
