# Arquitectura de la solución — BRIMEC

Diagramas de la **Oportunidad 3** de T-09: *Asistente Conversacional para Operaciones de Producción
y Taller*, tal como se diseña en T-10.

> Los diagramas están en Mermaid para que GitHub los renderice solo. Hay una versión con los
> logotipos de las herramientas en [`STACK.md`](STACK.md).

**Cómo leer los colores:**

| | Significado |
|---|---|
| 🟩 verde | Funciona en el prototipo entregado |
| 🟨 amarillo | Simulado — el flujo se representa, la tecnología no está conectada |
| ⬜ gris | Propuesto, no implementado |

---

## 1. Arquitectura conceptual

Patrón **agente con herramientas** (*tool calling*) sobre una arquitectura **desacoplada**: el
modelo generativo nunca toca los datos.

```mermaid
flowchart TD
    U["👤 Usuarios<br/>Administración · Operarios · Jefe de Producción"]
    W["💬 Widget conversacional del ERP<br/>texto y voz"]
    S["🎙️ Speech-to-Text<br/>transcripción del dictado"]
    L["✨ Modelo de IA generativa<br/>interpreta la intención<br/>y elige la herramienta"]

    subgraph MW["🛡️ API agente / Middleware · FastAPI"]
        direction LR
        A1["Autenticación"] --> A2["Autorización<br/>RBAC"]
        A2 --> A3["Reglas de<br/>negocio"]
        A3 --> A4["Confirmación<br/>de operaciones"]
        A4 --> A5["Auditoría"]
    end

    C["🔌 Conector ERP<br/>API REST"]
    E["🗄️ ERP SaaS · Odoo"]
    D[("Base de datos<br/>del ERP")]

    U --> W --> S --> L --> MW --> C --> E --> D

    classDef ok fill:#D1FAE5,stroke:#059669,stroke-width:2px,color:#065F46
    classDef sim fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#92400E
    classDef prop fill:#E2E8F0,stroke:#64748B,stroke-width:2px,color:#334155
    classDef ctrl fill:#FFFFFF,stroke:#0084D6,stroke-width:1px,color:#243673

    class U,W ok
    class S,L sim
    class C,E,D prop
    class A1,A2,A3,A4,A5 ctrl
    style MW fill:#EEF2FF,stroke:#0084D6,stroke-width:2px,color:#243673
```

**El punto central:** el LLM se usa *solo* para comprender lenguaje natural y redactar respuestas.
La autorización, la ejecución de transacciones y el acceso a los datos quedan bajo control del
middleware y del ERP. Esa separación es la que acota el riesgo de modificaciones indebidas.

---

## 2. Flujo de una operación de escritura

Las cuatro barreras que atraviesa cualquier cambio, en orden. Ninguna es opcional.

```mermaid
sequenceDiagram
    autonumber
    actor U as Jefe de Producción
    participant W as Widget
    participant L as Modelo (NLU)
    participant M as Middleware
    participant E as ERP

    U->>W: «Pasá el ítem 333 a tratamiento» 🎙️
    W->>L: transcripción
    L->>L: intención + extracción de parámetros

    rect rgb(254, 243, 199)
        note right of M: 1 · AUTORIZACIÓN
        L->>M: actualizar_estado_item(333, Tratamiento)
        M->>M: ¿el rol tiene la capacidad?
        alt no la tiene
            M-->>U: rechazo + motivo
            M->>E: AUDITORIA · resultado RECHAZADA
        end
    end

    rect rgb(224, 242, 254)
        note right of M: 2 · DATOS COMPLETOS
        M->>M: ¿falta algún identificador?
        alt falta
            M-->>U: repregunta — no infiere
        end
    end

    rect rgb(237, 233, 254)
        note right of M: 3 · REGLA DE NEGOCIO
        M->>E: consultar catálogo ETAPA_PRODUCCION
        E-->>M: etapas y transiciones válidas
        M->>M: ¿la transición está permitida?
        alt no permitida
            M-->>U: rechazo + transiciones habilitadas
        end
    end

    rect rgb(209, 250, 229)
        note right of M: 4 · CONFIRMACIÓN HUMANA
        M-->>U: estado actual → cambio propuesto
        U->>M: Confirmar
    end

    M->>E: ejecutar cambio
    E->>E: OF_DETALLE.estado · SEGUIMIENTO_ETAPA
    E->>E: recalcular ORDEN_FABRICACION.estado
    E->>E: AUDITORIA · resultado OK · canal voz
    E-->>U: confirmación del registro
```

Confirmar, cancelar y rechazar quedan **los tres** registrados en auditoría. Cancelar no es "no
pasó nada": es evidencia de que el control funcionó.

---

## 3. Matriz de permisos (RBAC)

```mermaid
flowchart LR
    ADM["🗂️ Administración"]
    OPE["🦺 Operario"]
    JEF["🏭 Jefe de Producción"]

    CC["Consultar clientes<br/>y pedidos"]
    CO["Consultar OF,<br/>ítems y artículos"]
    CR["Crear OF"]
    AC["Actualizar etapa<br/>de ítems"]
    CM["Registrar comentario<br/>de taller"]
    AU["Ver auditoría"]
    PR["Ver precios<br/>y montos"]

    ADM --> CC
    ADM --> CO
    ADM --> CR
    ADM --> AU
    ADM --> PR

    OPE --> CO
    OPE --> CM

    JEF --> CO
    JEF --> AC
    JEF --> CM
    JEF --> AU

    classDef rol fill:#243673,stroke:#1A2854,color:#FFFFFF,stroke-width:2px
    classDef cap fill:#FFFFFF,stroke:#CBD5E1,color:#334155
    classDef esc fill:#FEE2E2,stroke:#DC2626,color:#991B1B,stroke-width:2px

    class ADM,OPE,JEF rol
    class CC,CO,AU,PR cap
    class CR,AC,CM esc
```

Los tres recuadros rojos son las **operaciones de escritura**, y cada una pertenece a un único
perfil. Administración crea OF pero no actualiza etapas ni comenta; el operario comenta pero no
actualiza; solo el Jefe de Producción cambia etapas.

---

## 4. Modelo de datos del MVP

11 de las 28 tablas del modelo destino: exactamente las que T-09 lista en *"Datos e información
necesaria"*.

```mermaid
erDiagram
    CLIENTE ||--o{ PEDIDO : realiza
    PEDIDO ||--|{ PEDIDO_DETALLE : contiene
    ARTICULO ||--o{ PEDIDO_DETALLE : "se solicita en"
    PEDIDO ||--o{ ORDEN_FABRICACION : genera
    ORDEN_FABRICACION ||--|{ OF_DETALLE : incluye
    PEDIDO_DETALLE ||--o{ OF_DETALLE : "se traza en"
    ARTICULO ||--o{ OF_DETALLE : "se fabrica como"
    OF_DETALLE ||--o{ SEGUIMIENTO_ETAPA : registra
    ETAPA_PRODUCCION ||--o{ SEGUIMIENTO_ETAPA : compone
    OF_DETALLE ||--o{ COMENTARIO_TALLER : documenta
    EMPLEADO ||--o{ SEGUIMIENTO_ETAPA : asigna
    EMPLEADO ||--o{ COMENTARIO_TALLER : escribe
    EMPLEADO ||--o{ AUDITORIA : ejecuta

    CLIENTE {
        int cliente_id PK
        string razon_social
        string cuit UK
    }
    PEDIDO {
        int pedido_id PK
        int cliente_id FK
        date fecha_entrega_pactada
        string estado
    }
    PEDIDO_DETALLE {
        int pedido_detalle_id PK
        int articulo_id FK
        decimal cantidad
        decimal precio_unitario
    }
    ARTICULO {
        int articulo_id PK
        string codigo UK
        string material
        string norma
    }
    ORDEN_FABRICACION {
        int of_id PK
        int pedido_id FK
        string numero UK
        datetime fecha_estimada_fin
        string estado "derivado"
    }
    OF_DETALLE {
        int of_detalle_id PK
        int of_id FK
        int pedido_detalle_id FK
        string estado "etapa actual"
    }
    ETAPA_PRODUCCION {
        int etapa_id PK
        string nombre
        int orden
        boolean requiere_aprobacion
    }
    SEGUIMIENTO_ETAPA {
        int seguimiento_id PK
        int of_detalle_id FK
        int etapa_id FK
        datetime inicio
        datetime fin
    }
    COMENTARIO_TALLER {
        int comentario_id PK
        int of_detalle_id FK
        string texto
        string archivo_audio
    }
    EMPLEADO {
        int empleado_id PK
        string rol
        boolean activo
    }
    AUDITORIA {
        int auditoria_id PK
        string entidad
        int registro_id
        string operacion
        string resultado "EXT"
        string canal "EXT"
    }
```

### Dos decisiones que se leen en el diagrama

1. **`ORDEN_FABRICACION` no tiene `cliente_id`.** El cliente se alcanza por `PEDIDO`. Por eso
   *"las OF de Petrosur"* exige el join `OF_DETALLE → ORDEN_FABRICACION → PEDIDO → CLIENTE`.
2. **`COMENTARIO_TALLER` y `SEGUIMIENTO_ETAPA` cuelgan de `OF_DETALLE`, no de la OF.** Los
   comentarios y los cambios de etapa son **por ítem**. El estado de la OF es derivado: la etapa
   mínima de sus ítems. Por eso, si pedís *"agregá un comentario a la OF-203"* y esa OF tiene varios
   ítems, el asistente repregunta cuál.

### Lo que el modelo todavía no cubre

Las columnas marcadas `"EXT"` en `AUDITORIA` **no existen** en el ERD y el MVP las necesita:

| Falta | Por qué hace falta |
|---|---|
| `AUDITORIA.resultado` | T-09 exige registrar *"Usuario, Fecha, Acción, **Resultado**"*. Sin esa columna no hay dónde anotar un rechazo por permisos ni una cancelación |
| `AUDITORIA.canal` / `origen` | Sin ellos no se puede medir la adopción del asistente frente a las pantallas del ERP — que es la hipótesis a validar |
| Transiciones entre etapas | `ETAPA_PRODUCCION` no las modela. Haría falta una `ETAPA_TRANSICION` o un `etapa_siguiente_id` |
| `CONVERSACION` / `MENSAJE` | No existen. Las consultas de solo lectura no dejan rastro en ninguna tabla |

---

## 5. Qué está construido y qué no

```mermaid
flowchart TB
    subgraph REAL["🟩 Funciona en el prototipo"]
        direction TB
        R1["7 pantallas navegables<br/>3 perfiles con RBAC"]
        R2["Chat con dictado por voz<br/>Web Speech API"]
        R3["Consultas, filtros<br/>y ordenamientos"]
        R4["Confirmación previa<br/>a cada escritura"]
        R5["Catálogo de etapas<br/>configurable + transiciones"]
        R6["Auditoría con resultado,<br/>canal y origen"]
        R7["41 casos de prueba<br/>automatizados"]
    end

    subgraph SIM["🟨 Simulado"]
        direction TB
        S1["Comprensión del lenguaje:<br/>analizador por reglas,<br/>no un LLM"]
        S2["Transcripción:<br/>la hace el navegador"]
        S3["Persistencia:<br/>LocalStorage"]
    end

    subgraph NO["⬜ No implementado"]
        direction TB
        N1["Middleware FastAPI"]
        N2["Conector REST del ERP"]
        N3["ERP y base de datos"]
        N4["Seguridad del lado servidor"]
    end

    REAL -.->|"siguiente paso"| SIM -.->|"requiere el ERP"| NO

    style REAL fill:#D1FAE5,stroke:#059669,stroke-width:2px,color:#065F46
    style SIM fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#92400E
    style NO fill:#E2E8F0,stroke:#64748B,stroke-width:2px,color:#334155
```

> ⚠️ Los controles de permisos del prototipo corren **en el navegador**. Representan el flujo; **no
> son un control de seguridad**. En producción la validación debe ocurrir del lado del servidor.

---

## 6. El límite honesto del prototipo

T-09 descarta la automatización por reglas por rígida. El prototipo usa reglas —pero tolerantes— y
**documenta dónde se rompen**:

```mermaid
flowchart LR
    I["«pasá el ítem 333<br/>al torno»"] --> N{"Analizador<br/>por reglas"}
    I2["«mostrame las of<br/>de petro sur»"] --> N
    I3["«che, fijate si lo de la semana<br/>pasada ya salió del horno<br/>así le aviso al tipo»"] --> N

    N -->|"sinónimo de taller<br/>torno → Mecanizado"| OK1["✅ resuelve"]
    N -->|"coincidencia difusa<br/>petro sur → Petrosur"| OK2["✅ resuelve"]
    N -->|"sin plantilla que encaje"| KO["❌ no interpreta<br/>y lo informa"]

    KO --> LLM["✨ Esto es lo que<br/>aportaría el LLM"]

    classDef inp fill:#FFFFFF,stroke:#CBD5E1,color:#334155
    classDef nlu fill:#243673,stroke:#1A2854,color:#FFFFFF
    classDef bien fill:#D1FAE5,stroke:#059669,color:#065F46
    classDef mal fill:#FEE2E2,stroke:#DC2626,color:#991B1B
    classDef llm fill:#BFD1FF,stroke:#0084D6,color:#243673,stroke-width:2px

    class I,I2,I3 inp
    class N nlu
    class OK1,OK2 bien
    class KO mal
    class LLM llm
```

El caso de la derecha está cubierto por el test `LIM-01` y documentado como **CP-10** en T-10. El
template advierte que *"si el equipo no encontró ningún caso en el que la solución falle,
probablemente no probó suficiente"*. Ese es el caso.
