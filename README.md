# Las Marias

Catalogo mobile-first para joyas: productos con foto/precio, carrito y envio directo a WhatsApp. El admin es solo para la duena con Google.

## Stack

- Vite + React en JavaScript
- Firebase Auth y Firestore
- Vercel para hosting

## Correr local

```bash
npm install
npm run dev
```

Sin `.env`, la app funciona en modo demo con datos locales. Para produccion, crear `.env.local` copiando `.env.example`.

## Firebase

1. Crear proyecto en Firebase.
2. Crear una app web y copiar las variables a `.env.local`.
3. Activar Authentication > Google.
4. Activar Firestore Database.
5. Cambiar `tu-email@gmail.com` por el Gmail admin en `firestore.rules` y `VITE_ADMIN_EMAIL`.
6. Publicar las reglas desde Firebase Console o Firebase CLI.

Las fotos se comprimen en el navegador y se guardan en Firestore junto al producto. No usa Firebase Storage, asi evita el bloqueo de bucket nuevo que pide Blaze.

## Vercel + GitHub

1. Subir esta carpeta a GitHub.
2. Importar el repo en Vercel.
3. Agregar las mismas variables de `.env.local` en Project Settings > Environment Variables.
4. Deploy.

## Admin

Entrar a `/admin`, iniciar sesion con Google y cargar productos. Los ticks importantes son:

- Visible: aparece o no aparece en el catalogo publico.
- En stock: permite agregar al carrito.
- Volvio: muestra una etiqueta de regreso de stock.
