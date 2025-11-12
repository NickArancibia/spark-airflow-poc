# 💰 BTC Transaction System CLI

CLI interactivo y visualmente atractivo para interactuar con el sistema de transacciones BTC.

## 🚀 Características

- **👤 Gestión de Usuarios**
  - Consultar balance de usuarios
  - Listar todos los usuarios
  - Crear nuevos usuarios
  - Modificar balances

- **💸 Transacciones**
  - Ejecutar transacciones BTC
  - Ver historial de transacciones
  - Seguimiento en tiempo real

- **🔷 Liquidez**
  - Visualizar estado de liquidez BTC
  - Monitorear reservas y disponibilidad
  - Gráficos visuales de utilización

- **🔐 Seguridad**
  - Autenticación Basic Auth
  - Credenciales protegidas
  - Separación de permisos (usuario/admin)

## 📋 Requisitos Previos

1. **Servidor API corriendo**
   ```bash
   npm run api
   ```

2. **Servicios del sistema activos**
   ```bash
   # Opción 1: Iniciar todos juntos
   ./start-all.sh
   
   # Opción 2: Iniciar individualmente
   npm run validator
   npm run liquidity
   npm run payment
   npm run api
   ```

3. **Dependencias instaladas**
   ```bash
   npm install
   ```

## 🎯 Uso

### Iniciar el CLI

```bash
npm run cli
```

O directamente:

```bash
node cli/index.js
```

### Configurar URL del API (opcional)

Por defecto, el CLI se conecta a `http://localhost:3000`. Para cambiar esto:

```bash
API_URL=http://otro-servidor:3000 npm run cli
```

## 🔑 Credenciales

### Usuarios de Prueba

| Email | Password | Balance | Rol |
|-------|----------|---------|-----|
| admin@example.com | admin123 | $100,000,000,000.00 | Admin |
| user1@example.com | password123 | $5,000.00 | Usuario |
| user2@example.com | password456 | $2,500.50 | Usuario |

### Operaciones que Requieren Admin

- Listar todos los usuarios
- Crear nuevos usuarios
- Modificar balances de usuarios

### Operaciones de Usuario Normal

- Consultar su propio balance
- Ejecutar transacciones con sus fondos

## 📖 Guía de Uso

### 1. Consultar Balance

1. Seleccionar "👤 Consultar balance de usuario"
2. Ingresar email del usuario
3. Ingresar contraseña
4. Ver información del balance

### 2. Ejecutar Transacción

1. Seleccionar "💸 Ejecutar transacción"
2. Ingresar credenciales del usuario
3. Ingresar IBAN de destino
4. Especificar monto y moneda
5. Confirmar y esperar procesamiento
6. Ver resultado de la transacción

### 3. Crear Usuario (Admin)

1. Seleccionar "➕ Crear nuevo usuario"
2. Ingresar email del nuevo usuario
3. Establecer contraseña
4. Definir balance inicial
5. Usuario creado y listo para usar

### 4. Modificar Balance (Admin)

1. Seleccionar "💰 Modificar balance de usuario"
2. Ingresar email del usuario
3. Elegir acción (agregar/restar/establecer)
4. Especificar monto
5. Confirmar cambios

### 5. Ver Liquidez BTC

1. Seleccionar "🔷 Ver estado de liquidez BTC"
2. Ver métricas de liquidez:
   - Total BTC
   - BTC disponible
   - BTC reservado
   - Porcentaje de utilización
   - Valores en USD

## 🎨 Características Visuales

- **Colores**: Códigos de color intuitivos (verde=éxito, rojo=error, amarillo=advertencia)
- **Tablas**: Información organizada en tablas claras
- **Spinners**: Indicadores de progreso para operaciones asíncronas
- **Iconos**: Emojis para mejor identificación visual
- **Gráficos**: Barras de progreso para visualización de datos

## 🐛 Solución de Problemas

### Error: "No se pudo conectar al servidor"

**Causa**: El servidor API no está corriendo

**Solución**:
```bash
npm run api
```

### Error: "Invalid credentials"

**Causa**: Email o contraseña incorrectos

**Solución**: Verificar credenciales o usar las de prueba listadas arriba

### Error: "This operation requires admin privileges"

**Causa**: Intentando realizar operación de admin sin credenciales correctas

**Solución**: 
1. Seleccionar "⚙️ Configurar credenciales admin"
2. Ingresar credenciales de admin
3. Reintentar operación

### Timeout en transacciones

**Causa**: Servicios del sistema no están respondiendo

**Solución**: Verificar que todos los servicios estén corriendo:
```bash
# Ver estado
tmux attach -t kafka-services

# O verificar individualmente
curl http://localhost:3000/health
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# URL del servidor API
export API_URL=http://localhost:3000

# Timeout para requests (ms)
export REQUEST_TIMEOUT=35000
```

### Modificar Credenciales Admin por Defecto

Editar en `cli/index.js`:

```javascript
let adminEmail = "tu-admin@ejemplo.com";
let adminPassword = "tu-password-seguro";
```

## 📡 Endpoints API Utilizados

- `GET /health` - Health check
- `GET /system/info` - Información del sistema
- `GET /users` - Listar usuarios (admin)
- `GET /users/:email` - Info de usuario
- `GET /users/:email/balance` - Balance de usuario
- `POST /users` - Crear usuario (admin)
- `PATCH /users/:email/balance` - Modificar balance (admin)
- `GET /liquidity` - Estado de liquidez
- `POST /transaction` - Crear transacción

## 🚦 Estados de Transacción

- ✅ **completed**: Transacción completada exitosamente
- ❌ **rejected**: Transacción rechazada (balance insuficiente, usuario no existe, etc.)
- ⏳ **timeout**: Timeout esperando respuesta del sistema

## 💡 Tips

1. **Test de Conexión**: Usar "🔌 Test de conexión API" para verificar conectividad
2. **Historial Local**: El historial de transacciones solo persiste durante la sesión del CLI
3. **Auto-refresh**: El precio BTC y datos del sistema se actualizan al volver al menú principal
4. **Navegación**: Siempre puedes volver al menú principal con Enter

## 📚 Recursos Adicionales

- Ver `api/server.js` para documentación completa de endpoints
- Ver `start-all.sh` para gestión de servicios
- Consultar logs del servidor API para debugging detallado

## 🤝 Contribuir

Para agregar nuevas funcionalidades al CLI:

1. Agregar endpoint correspondiente en `api/server.js`
2. Implementar función en `cli/index.js`
3. Agregar opción al menú principal
4. Actualizar este README

---

**Desarrollado con ❤️ usando Node.js, Express, Inquirer, Chalk y Kafka**

