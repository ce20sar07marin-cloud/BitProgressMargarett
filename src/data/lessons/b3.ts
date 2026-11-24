import { LessonConfig } from "@/types/lesson";

const b3: LessonConfig = {
  id: "b3",
  title: "Dispositivos de red",
  pages: [
    {
      id: "b3-p1",
      title: "Dispositivos de conexión",
      content:
        "Para que una red exista necesitas dispositivos que permitan la comunicación. Los más comunes son el módem, el router y el switch, cada uno con una función diferente dentro de la red.",
      illustration: require("@/assets/images/b3/DispositivosdeConexion.png"),
    },
    {
      id: "b3-p2",
      title: "Router y Switch",
      content:
        "El router conecta redes diferentes y dirige el tráfico de datos. El switch conecta dispositivos dentro de la misma red local, enviando datos solo al dispositivo correcto.",
      illustration: require("@/assets/images/b3/RouterySwiches.png"),
    },
    {
      id: "b3-p3",
      title: "Otros dispositivos",
      content:
        "Un punto de acceso WiFi permite la conexión inalámbrica. Un firewall protege la red de accesos no autorizados. Los servidores almacenan y distribuyen datos a los demás dispositivos.",
      illustration: require("@/assets/images/b3/OtrosDispositivos.png"),
    },
    {
      id: "b3-p4",
      title: "Resumen",
      content:
        "\u2714 Los dispositivos de red incluyen módems, routers, switches, puntos de acceso WiFi, firewalls y servidores.\n\n\u2714 Cada uno cumple una función específica para mantener la red funcionando.",
    },
    {
      id: "b3-p5",
      title: "Prueba práctica",
      content: "",
      quiz: {
        type: "true-false",
        question: "El switch conecta dispositivos dentro de la misma red local.",
        options: [
          { label: "Verdadero", isCorrect: true },
          { label: "Falso", isCorrect: false },
        ],
        explanation:
          "El switch envía datos solo al dispositivo correcto dentro de la misma red local.",
      },
    },
  ],
};

export { b3 };
export default b3;