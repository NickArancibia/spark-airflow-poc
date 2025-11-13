# 💰 Sistema de Transacciones BTC con Kafka

Sistema distribuido basado en eventos para procesamiento de transacciones BTC en tiempo real, utilizando Apache Kafka como bus de eventos, Redis como base de datos y Node.js para los microservicios.

## 📋 Tabla de Contenidos

- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Inicio Rápido](#-inicio-rápido)
- [Componentes del Sistema](#-componentes-del-sistema)
- [Flujo de Transacciones](#-flujo-de-transacciones)
- [Uso del CLI](#-uso-del-cli)
- [Ejemplos de Uso](#-ejemplos-de-uso)
- [API REST](#-api-rest)
- [Troubleshooting](#-troubleshooting)

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (Cliente)                       │
│                  Interfaz Interactiva                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Server (Puerto 3000)                   │
│              - Autenticación Basic Auth                     │
│              - Gestión de usuarios (Redis)                  │
│              - Producer/Consumer Kafka                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Kafka Events (tx.events)
                           ↓
┌──────────────────────────────────────────────────────────┐
│                    Apache Kafka + Zookeeper              │
│                    Topic: tx.events                      │
└─────┬──────────┬──────────┬──────────────────────────────┘
      │          │          │
      ↓          ↓          ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│Validator │ │Liquidity │ │ Payment  │
│ Service  │ │ Service  │ │ Service  │
└──────────┘ └──────────┘ └──────────┘
      │          │          │
      └──────────┴──────────┘
               ↓
      ┌─────────────────┐
      │  Redis Database │
      │   (User Data)   │
      └─────────────────┘
```

### Flujo de Eventos

1. **NewOrderReceived** → Nueva orden de transacción
2. **TransactionValidated** → Validación de usuario y saldo
3. **LiquidityReady** → Reserva de liquidez BTC
4. **PaymentCompleted** → Pago procesado exitosamente
5. **Rejected** → Rechazo por validación o error

## 📦 Requisitos Previos

- **Docker** y **Docker Compose**
- **Node.js** v18 o superior (solo para el CLI)

## 🚀 Inicio Rápido

**Paso 1: Iniciar el sistema**

```bash
npm start
```

O directamente:

```bash
docker compose up -d
```

Este comando levanta **todos los servicios** en contenedores Docker.

**Paso 2: Esperar unos segundos** hasta que todos los servicios estén listos.

**Paso 3: Iniciar el CLI (en otra terminal)**

```bash
npm install  # Solo la primera vez
npm run cli
```

**Para detener el sistema:**

```bash
npm run down
```

## 🧩 Componentes del Sistema

### 1. **API Server** (`server/server.js`)
- Servidor HTTP REST en puerto 3000
- Autenticación Basic Auth
- Producer y Consumer de Kafka
- Gestión de usuarios en Redis
- Timeout de 30 segundos para transacciones

### 2. **Validator Service** (`validator/index.js`)
- Consumer de eventos `NewOrderReceived`
- Valida existencia de usuario en Redis
- Verifica saldo suficiente
- Produce: `TransactionValidated` o `Rejected`

### 3. **Liquidity Service** (`liquidity/index.js`)
- Consumer de eventos `TransactionValidated`
- Gestiona pool de liquidez BTC
- Auto-compra BTC si hay déficit
- Produce: `LiquidityReady` o `Rejected`

### 4. **Payment Service** (`payment/index.js`)
- Consumer de eventos `LiquidityReady`
- Deduce saldo del usuario en Redis
- Simula procesamiento de pago BTC
- Produce: `PaymentCompleted` o `Rejected`

### 5. **Redis Database** (`data/users.js`)
- Almacena usuarios con email, password y balance
- Keys: `user:<email>` (JSON)
- Lista: `users_list` (emails)

### 6. **CLI** (`cli/index.js`)
- Interfaz interactiva de línea de comandos
- Se comunica con API Server vía HTTP
- Visualización con colores y tablas

## 🔄 Flujo de Transacciones

```
┌──────────┐
│   CLI    │ POST /transaction {destinationIban, amount}
└─────┬────┘
      │
      ↓
┌─────────────────┐
│   API Server    │ Produce: NewOrderReceived
└─────┬───────────┘
      │
      ↓  Kafka: tx.events
┌─────────────────┐
│   Validator     │ Consume: NewOrderReceived
│                 │ Verifica usuario y saldo en Redis
└─────┬───────────┘
      │
      ↓  Produce: TransactionValidated
┌─────────────────┐
│   Liquidity     │ Consume: TransactionValidated
│                 │ Reserva BTC (auto-compra si es necesario)
└─────┬───────────┘
      │
      ↓  Produce: LiquidityReady
┌─────────────────┐
│    Payment      │ Consume: LiquidityReady
│                 │ Deduce saldo de Redis
└─────┬───────────┘
      │
      ↓  Produce: PaymentCompleted
┌─────────────────┐
│   API Server    │ Consume: PaymentCompleted
│                 │ Responde al cliente
└─────┬───────────┘
      │
      ↓
┌──────────┐
│   CLI    │ Muestra resultado
└──────────┘
```

## 💻 Uso del CLI

El CLI proporciona las siguientes funcionalidades:

### Menú Principal

```
💰 BTC TRANSACTION SYSTEM CLI 💰

¿Qué deseas hacer?
  👤 Consultar balance de usuario
  💸 Ejecutar transacción
  🔷 Ver estado de liquidez BTC
  📊 Ver historial de transacciones
  🔌 Test de conexión API
  ─────────────────────────────
  🚪 Salir
```

### Usuarios Pre-configurados

| Email | Password | Balance Inicial | Descripción |
|-------|----------|----------------|-------------|
| admin@example.com | admin123 | $1,500.00 | Usuario administrador |
| user1@example.com | password123 | $2,300.00 | Usuario regular |
| user2@example.com | password456 | $120.43 | Usuario con saldo bajo |

## 📝 Ejemplos de Uso

### ✅ Ejemplo 1: Transacción Exitosa

**Escenario:** Usuario admin envía $100 USD a un IBAN

1. Iniciar el CLI: `npm run cli`
2. Seleccionar: `💸 Ejecutar transacción`
3. Ingresar credenciales:
   - **Email:** `admin@example.com`
   - **Password:** `admin123`
4. Datos de la transacción:
   - **IBAN de destino:** `E0123456789`
   - **Monto (USD):** `100`
5. Presionar Enter

**Resultado esperado:**
```
✅ Transacción completada exitosamente

╔══════════════════════════════════════╗
║ 📊 Detalles de la Transacción       ║
╚══════════════════════════════════════╝

Estado:           ✅ Completada
Monto USD:        $100.00
Monto BTC:        ₿0.00098765
Invoice ID:       inv-a1b2c3d4e5f6
TX ID:            btc-1699876543210
Email:            admin@example.com
Timestamp:        2025-11-12T15:30:45.123Z
```

**Balance después:** $1,400.00 (se  dedujo  $100)

### ❌ Ejemplo 2: Saldo Insuficiente

**Escenario:** Usuario con saldo bajo intenta transferir más de lo que tiene

1. Iniciar el CLI: `npm run cli`
2. Seleccionar: `💸 Ejecutar transacción`
3. Ingresar credenciales:
   - **Email:** `user2@example.com`
   - **Password:** `password456`
4. Datos de la transacción:
   - **IBAN de destino:** `E0123456789`
   - **Monto (USD):** `500`
5. Presionar Enter

**Resultado esperado:**
```
❌ Transacción rechazada

╔══════════════════════════════════════╗
║ ⚠️  Error en la Transacción          ║
╚══════════════════════════════════════╝

Estado:           ❌ Rechazada
Razón:            Insufficient balance
Email:            user2@example.com
Timestamp:        2025-11-12T15:32:10.456Z
```

**Balance después:** $120.43 (sin cambios)

### 🔍 Ejemplo 3: Consultar Balance

1. Iniciar el CLI: `npm run cli`
2. Seleccionar: `👤 Consultar balance de usuario`
3. Ingresar credenciales:
   - **Email:** `user1@example.com`
   - **Password:** `password123`

**Resultado esperado:**
```
✅ Balance obtenido

╔════════════════════════════════════╗
║ 💰 Balance de Usuario              ║
╚════════════════════════════════════╝

Campo             Valor
Email             user1@example.com
Balance USD       $2,300.00
Balance BTC       ₿0.02272049
BTC Price         $101,232.12
Timestamp         2025-11-12T15:35:00.789Z
```

### 🔷 Ejemplo 4: Ver Estado de Liquidez

1. Iniciar el CLI: `npm run cli`
2. Seleccionar: `🔷 Ver estado de liquidez BTC`

**Resultado esperado:**
```
✅ Estado de liquidez obtenido

╔════════════════════════════════════╗
║ 🔷 Liquidez BTC del Sistema        ║
╚════════════════════════════════════╝

Campo                 Valor
Total BTC            ₿50.00000000
Disponible BTC       ₿45.50000000
Reservado BTC        ₿4.50000000
Utilización          9.00%

Valores en USD:
Total USD            $5,061,606.00
Disponible USD       $4,606,061.46
BTC Price            $101,232.12

[████████████████████████░░░░░░░░░░░░] 9.00%
```

## 🔐 Seguridad

- **Autenticación:** Basic Auth (Base64)
- **Passwords:** Almacenadas en texto plano en Redis (⚠️ solo para desarrollo/POC)
- **Autorización:** Los usuarios solo pueden ver su propia información
- **Red Docker:** Servicios aislados en red interna, solo API expone puerto 3000