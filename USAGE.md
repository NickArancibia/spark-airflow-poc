# 🚀 Guía de Uso Completa - Sistema BTC Transaction

## 📁 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (Cliente)                        │
│                  Interfaz Interactiva                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Server (Puerto 3000)                │
│   - Endpoints REST                                           │
│   - Autenticación                                            │
│   - Gestión de usuarios                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Kafka Events
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    KAFKA (tx.events topic)                   │
└─────┬──────────┬──────────┬──────────────────────────────┘
      │          │          │
      ↓          ↓          ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│Validator │ │Liquidity │ │ Payment  │
│ Service  │ │ Service  │ │ Service  │
└──────────┘ └──────────┘ └──────────┘
```

## 🎯 Componentes del Sistema

### 1. **API Server** (`api/server.js`)
- Servidor HTTP REST en puerto 3000
- Maneja autenticación y autorización
- Expone endpoints para gestión de usuarios, transacciones y liquidez
- Produce eventos Kafka para transacciones
- Consume respuestas de servicios

### 2. **CLI** (`cli/index.js`)
- Cliente interactivo de línea de comandos
- Se conecta al API Server vía HTTP
- Interfaz visual con colores y tablas
- **Microservicio independiente** - no accede directamente a datos

### 3. **Validator Service** (`validator/index.js`)
- Valida transacciones entrantes
- Verifica existencia de usuarios
- Comprueba balances suficientes
- Emite eventos: `TransactionValidated` o `Rejected`

### 4. **Liquidity Service** (`liquidity/index.js`)
- Gestiona liquidez de BTC
- Reserva BTC para transacciones validadas
- Auto-compra BTC cuando hay déficit
- Emite evento: `LiquidityReady`

### 5. **Payment Service** (`payment/index.js`)
- Simula procesamiento de pagos BTC
- Genera invoices y transaction IDs
- Emite evento: `PaymentCompleted`

### 6. **Data Layer** (`data/users.js`)
- Base de datos en memoria de usuarios
- Funciones para gestión de balances
- Accedido solo por API Server

## 🔄 Flujo de una Transacción

```
1. CLI → API: POST /transaction
         ↓
2. API → Kafka: NewOrderReceived
         ↓
3. Validator: Verifica usuario y balance
         ↓ (si válido)
4. Validator → Kafka: TransactionValidated
         ↓
5. Liquidity: Reserva/compra BTC
         ↓
6. Liquidity → Kafka: LiquidityReady
         ↓
7. Payment: Procesa pago BTC
         ↓
8. Payment → Kafka: PaymentCompleted
         ↓
9. API → CLI: Respuesta con resultado
```

## 🚀 Inicio Rápido

### Opción 1: Inicio Automático (Recomendado)

```bash
# 1. Levantar Kafka
npm run up

# 2. Instalar dependencias (primera vez)
npm install

# 3. Iniciar todos los servicios en tmux
./start-all.sh

# Esto iniciará en paneles separados:
# - Validator Service
# - Liquidity Service  
# - Payment Service
# - API Server

# 4. En otra terminal, iniciar el CLI
npm run cli
```

### Opción 2: Inicio Manual

```bash
# Terminal 1: Kafka
npm run up

# Terminal 2: Validator
npm run validator

# Terminal 3: Liquidity
npm run liquidity

# Terminal 4: Payment
npm run payment

# Terminal 5: API Server
npm run api

# Terminal 6: CLI
npm run cli
```

### Opción 3: Modo Desarrollo

```bash
# Inicia todos los servicios con hot-reload
npm run dev:all

# En otra terminal
npm run cli
```

## 📋 Scripts Disponibles

### Producción
- `npm run up` - Levantar Docker (Kafka/Zookeeper)
- `npm run down` - Bajar Docker
- `npm run validator` - Iniciar Validator Service
- `npm run liquidity` - Iniciar Liquidity Service
- `npm run payment` - Iniciar Payment Service
- `npm run api` - Iniciar API Server
- `npm run cli` - Iniciar CLI interactivo

### Desarrollo
- `npm run dev:validator` - Validator con hot-reload
- `npm run dev:liquidity` - Liquidity con hot-reload
- `npm run dev:payment` - Payment con hot-reload
- `npm run dev:api` - API con hot-reload
- `npm run dev:all` - Todos los servicios con hot-reload

## 🔌 API Endpoints

### 🏥 Health & System

```bash
# Health check
GET /health

# System info (BTC price, etc.)
GET /system/info
```

### 👥 Users

```bash
# List all users (admin only)
GET /users
Authorization: Basic YWRtaW5AZXhhbXBsZS5jb206YWRtaW4xMjM=

# Get user info
GET /users/:email
Authorization: Basic <user-credentials>

# Get user balance
GET /users/:email/balance
Authorization: Basic <user-credentials>

# Create user (admin only)
POST /users
Authorization: Basic <admin-credentials>
Content-Type: application/json
{
  "email": "nuevo@example.com",
  "password": "password123",
  "initialBalance": 1000.00
}

# Update user balance (admin only)
PATCH /users/:email/balance
Authorization: Basic <admin-credentials>
Content-Type: application/json
{
  "action": "add",  // "add" | "subtract" | "set"
  "amount": 500.00
}
```

### 🔷 Liquidity

```bash
# Get liquidity status
GET /liquidity
```

### 💸 Transactions

```bash
# Create transaction
POST /transaction
Authorization: Basic <user-credentials>
Content-Type: application/json
{
  "destinationIban": "ES1234567890123456789012",
  "amount": 100.00,
  "currency": "USD"
}
```

## 🔐 Autenticación

El sistema usa **Basic Authentication**:

```bash
# Formato del header
Authorization: Basic base64(email:password)

# Ejemplo con curl
curl -u "user1@example.com:password123" \
  http://localhost:3000/users/user1@example.com/balance
```

### Usuarios Pre-configurados

| Email | Password | Balance | Rol |
|-------|----------|---------|-----|
| admin@example.com | admin123 | $100B | Admin |
| user1@example.com | password123 | $5,000 | User |
| user2@example.com | password456 | $2,500.50 | User |

## 🎨 Características del CLI

### Visual
- ✅ Colores intuitivos (verde/rojo/amarillo/cyan)
- 📊 Tablas formateadas
- ⏳ Spinners de carga
- 📈 Gráficos de barras para liquidez
- 🎯 Iconos y emojis

### Funcional
- 👤 Consultar balances
- 💸 Ejecutar transacciones
- 📋 Listar usuarios (admin)
- ➕ Crear usuarios (admin)
- 💰 Modificar balances (admin)
- 🔷 Ver liquidez BTC
- 📊 Historial de transacciones
- ⚙️ Configuración de credenciales
- 🔌 Test de conexión

## 🐛 Troubleshooting

### El CLI no se conecta al API

```bash
# Verificar que el API esté corriendo
curl http://localhost:3000/health

# Si no responde, iniciar el API
npm run api
```

### Transacciones en timeout

```bash
# Verificar que todos los servicios estén activos
# Si usas tmux:
tmux attach -t kafka-services

# Verificar Kafka
docker ps | grep kafka
```

### Error "User not found"

```bash
# Crear el usuario vía CLI (necesitas credenciales admin)
npm run cli
# Luego seleccionar "Crear nuevo usuario"
```

### Error "Insufficient balance"

```bash
# Opción 1: Usar CLI para agregar fondos (admin)
npm run cli
# → Modificar balance de usuario → Agregar fondos

# Opción 2: API directamente
curl -u "admin@example.com:admin123" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"action":"add","amount":1000}' \
  http://localhost:3000/users/user1@example.com/balance
```

## 📊 Monitoreo

### Ver logs del sistema

```bash
# Si usas tmux
tmux attach -t kafka-services

# Navegar entre paneles:
# Ctrl+B → flechas

# Salir sin cerrar servicios:
# Ctrl+B → D
```

### Verificar estado de servicios

```bash
# API Health
curl http://localhost:3000/health

# System Info
curl http://localhost:3000/system/info

# Liquidity Status
curl http://localhost:3000/liquidity
```

## 🔄 Flujo de Eventos Kafka

### Topics
- `tx.events` - Topic principal con todos los eventos

### Event Types
1. `NewOrderReceived` - Nueva transacción solicitada
2. `TransactionValidated` - Transacción validada
3. `Rejected` - Transacción rechazada
4. `LiquidityReady` - Liquidez reservada
5. `PaymentCompleted` - Pago completado

### Event Schema

```javascript
{
  transaction_id: "uuid",
  type: "EventType",
  email: "user@example.com",
  payload: { /* event-specific data */ },
  ts: "2025-11-12T10:30:00.000Z"
}
```

## 🧪 Testing

### Test de transacción exitosa

```bash
# Via CLI
npm run cli
# → Ejecutar transacción
# → user1@example.com / password123
# → Monto: 100

# Via API
curl -u "user1@example.com:password123" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "destinationIban": "ES1234567890123456789012",
    "amount": 100,
    "currency": "USD"
  }' \
  http://localhost:3000/transaction
```

### Test de transacción rechazada (balance insuficiente)

```bash
curl -u "user1@example.com:password123" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "destinationIban": "ES1234567890123456789012",
    "amount": 999999,
    "currency": "USD"
  }' \
  http://localhost:3000/transaction
```

## 📦 Dependencias Principales

- **express** - API Server
- **kafkajs** - Kafka client
- **inquirer** - CLI interactivo
- **chalk** - Colores en terminal
- **cli-table3** - Tablas formateadas
- **axios** - HTTP client
- **ora** - Spinners de carga
- **uuid** - IDs únicos

## 🔒 Seguridad

- ✅ Autenticación requerida en todos los endpoints sensibles
- ✅ Separación de permisos (usuario/admin)
- ✅ Validación de inputs
- ✅ Headers CORS configurados
- ⚠️ **Nota**: Este es un proyecto de prueba, no usar en producción sin mejoras de seguridad

## 📝 Notas Importantes

1. **Persistencia**: Los datos están en memoria, se pierden al reiniciar
2. **Precio BTC**: Hardcodeado en $101,232.12 (en producción usar oracle)
3. **Liquidez**: Sistema auto-compra BTC cuando hay déficit
4. **CLI**: Es un microservicio independiente que solo usa HTTP
5. **Kafka**: Requiere Docker para funcionar

## 🚦 Estado del Sistema

### Verde ✅ - Todo OK
- Todos los servicios corriendo
- Kafka conectado
- API respondiendo
- Transacciones fluyendo

### Amarillo ⚠️ - Advertencias
- Alta utilización de liquidez (>80%)
- Timeout ocasional en transacciones
- CLI sin conexión al API

### Rojo ❌ - Errores
- Servicios caídos
- Kafka desconectado
- API no responde
- Transacciones fallando

## 💡 Tips de Uso

1. **Siempre iniciar Kafka primero** con `npm run up`
2. **Usar tmux** para gestionar múltiples servicios fácilmente
3. **Test de conexión** en CLI antes de hacer operaciones
4. **Monitorear logs** para entender el flujo de eventos
5. **Balance suficiente** asegurate de tener fondos antes de transacciones

## 🎓 Para Aprender Más

- Ver código de cada servicio en sus respectivos directorios
- Revisar `cli/README.md` para detalles del CLI
- Explorar `api/server.js` para documentación de endpoints
- Consultar logs de Kafka para debugging avanzado

---

**Sistema creado para demostración de arquitectura de microservicios con Kafka y API REST**

