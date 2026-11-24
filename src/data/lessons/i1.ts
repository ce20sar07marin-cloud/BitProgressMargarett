import { LessonConfig, LessonPage } from "@/types/lesson";

const i1: LessonConfig = {
  id: "i1",
  title: "Direccionamiento IP",
  pages: [
    {
      id: "i1-p1",
      title: "¿Qué es una IP?",
      content:
        "Una dirección IP es un identificador numérico asignado a cada dispositivo dentro de una red. Su función es permitir que los dispositivos se encuentren y se comuniquen entre sí.",
      illustration: require("@/assets/images/i1/QueesunaIP.png"),
    },
    {
      id: "i1-p2",
      title: "IPv4",
      content:
        "IPv4 utiliza direcciones de 32 bits, lo que permite aproximadamente 4.3 mil millones de direcciones únicas. Se escribe en cuatro grupos de números del 0 al 255 separados por puntos, como 192.168.1.1.",
      illustration: require("@/assets/images/i1/IPv4.png"),
    },
    {
      id: "i1-p3",
      title: "IPv6",
      content:
        "IPv6 utiliza direcciones de 128 bits para resolver el agotamiento de IPv4. Se escribe en ocho grupos de números hexadecimales separados por dos puntos.",
      illustration: require("@/assets/images/i1/IPv6.png"),
    },
    {
      id: "i1-p4",
      title: "Dirección IP pública vs privada",
      content:
        "Una IP pública es visible en Internet y la asigna tu proveedor. Una IP privada solo funciona dentro de tu red local, como 192.168.x.x, y no es visible desde fuera.",
      illustration: require("@/assets/images/i1/DireccionIPpublicavsIPprivada.png"),
    },
    {
      id: "i1-p5",
      title: "MAC Address",
      content:
        "La dirección MAC es un identificador físico único grabado en la tarjeta de red de cada dispositivo. A diferencia de la IP, la MAC no cambia independientemente de la red a la que te conectes.",
      illustration: require("@/assets/images/i1/MACAddress.png"),
    },
    {
      id: "i1-p6",
      title: "Resumen",
      content:
        "✔ Las direcciones IP identifican dispositivos en una red.\n\n✔ IPv4 usa 32 bits, IPv6 usa 128 bits.\n\n✔ Las IPs públicas son para Internet, las privadas para redes locales.\n\n✔ La MAC Address es el ID físico del dispositivo.",
    },
    {
      id: "i1-p7",
      title: "Prueba práctica",
      content: "",
      quiz: {
        type: "multiple-choice",
        question: "¿Cuántos bits utiliza una dirección IPv4?",
        options: [
          { label: "16 bits", isCorrect: false },
          { label: "32 bits", isCorrect: true },
          { label: "64 bits", isCorrect: false },
          { label: "128 bits", isCorrect: false },
        ],
        explanation:
          "IPv4 utiliza direcciones de 32 bits, lo que permite aproximadamente 4.3 mil millones de direcciones.",
      },
    },
  ],
};

export default i1;
