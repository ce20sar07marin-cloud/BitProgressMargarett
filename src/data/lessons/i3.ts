import { LessonConfig, LessonPage } from "@/types/lesson";

const i3: LessonConfig = {
  id: "i3",
  title: "Topologías de red",
  pages: [
    {
      id: "i3-p1",
      title: "¿Qué es una topología?",
      content:
        "La topología de red es la forma en que los dispositivos están organizados y conectados. Puede ser física (cableado real) o lógica (cómo fluyen los datos).",
      illustration: require("@/assets/images/i3/QueesUnaTopologia.png"),
    },
    {
      id: "i3-p2",
      title: "Topología estrella",
      content:
        "En la topología estrella todos los dispositivos se conectan a un punto central, normalmente un switch. Es la más común en hogares y oficinas por su facilidad de administración.",
      illustration: require("@/assets/images/i3/TopologiadeEstrella.png"),
    },
    {
      id: "i3-p3",
      title: "Topología bus y anillo",
      content:
        "En la topología bus todos comparten un cable principal. En la topología anillo los dispositivos forman un círculo cerrado. Ambas son menos utilizadas hoy en día.",
      illustration: require("@/assets/images/i3/TopologiadeBusyAnillo.png"),
    },
    {
      id: "i3-p4",
      title: "Topología malla",
      content:
        "En la topología malla cada dispositivo se conecta con varios otros. Ofrece alta disponibilidad pero es costosa. Se usa en redes críticas como las de telecomunicaciones.",
      illustration: require("@/assets/images/i3/Topologiademalla.png"),
    },
    {
      id: "i3-p5",
      title: "Prueba práctica",
      content: "",
      quiz: {
        type: "multiple-choice",
        question:
          "¿En qué topología todos los dispositivos se conectan a un punto central?",
        options: [
          { label: "Bus", isCorrect: false },
          { label: "Anillo", isCorrect: false },
          { label: "Estrella", isCorrect: true },
          { label: "Malla", isCorrect: false },
        ],
        explanation:
          "En la topología estrella todos los dispositivos se conectan a un punto central, normalmente un switch.",
      },
    },
  ],
};

export default i3;