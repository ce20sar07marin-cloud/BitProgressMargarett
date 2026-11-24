import { LessonConfig, LessonPage } from "@/types/lesson";

const i2: LessonConfig = {
  id: "i2",
  title: "Subredes y máscara",
  pages: [
    {
      id: "i2-p1",
      title: "¿Qué es una subred?",
      content:
        "Una subred es una división de una red más grande. Permite organizar los dispositivos en grupos, mejorar el rendimiento y facilitar la administración del tráfico de datos.",
      illustration: require("@/assets/images/i2/QueesUnaSubred.png"),
    },
    {
      id: "i2-p2",
      title: "La máscara de subred",
      content:
        "La máscara de subred determina qué parte de una dirección IP corresponde a la red y cuál a los dispositivos. Se escribe como 255.255.255.0, indicando que los primeros tres octetos son la red.",
      illustration: require("@/assets/images/i2/LaMasccaraDeSubred.png"),
    },
    {
      id: "i2-p3",
      title: "CIDR",
      content:
        "CIDR (Classless Inter-Domain Routing) es una forma más flexible de representar subredes usando una barra y un número, como /24. Indica cuántos bits corresponden a la red.",
      illustration: require("@/assets/images/i2/CIDR.png"),
    },
    {
      id: "i2-p4",
      title: "Calcular subredes",
      content:
        "Para calcular subredes necesitas saber cuántos dispositivos conectados tendrás. Cada subred necesita una dirección de red, una de broadcast y al menos una IP para el router.",
      illustration: require("@/assets/images/i2/CalcularSubredes.png"),
    },
    {
      id: "i2-p5",
      title: "Resumen",
      content:
        "✔ Las subredes dividen una red grande en partes más pequeñas.\n\n✔ La máscara determina la red vs los dispositivos.\n\n✔ CIDR es la notación moderna para representar subredes.",
    },
    {
      id: "i2-p6",
      title: "Prueba práctica",
      content: "",
      quiz: {
        type: "fill-blank",
        question:
          "La máscara de subred 255.255.255.0 indica que los primeros ___ octetos son la red.",
        blankAnswer: ["tres", "3"],
        explanation:
          "255.255.255.0 indica que los primeros tres octetos identifican la red y el último identifica los dispositivos.",
      },
    },
  ],
};

export default i2;