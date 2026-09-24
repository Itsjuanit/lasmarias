import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  adminEmail,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  firebaseReady,
  getDownloadURL,
  onAuthStateChanged,
  onSnapshot,
  provider,
  query,
  ref,
  serverTimestamp,
  signInWithPopup,
  signOut,
  storage,
  updateDoc,
  uploadBytes,
  whatsappNumber,
  where,
} from "./firebase";

const seedProducts = [
  {
    id: "demo-1",
    name: "Aros dije de cubic",
    category: "Aros",
    price: 8900,
    description: "Argollitas delicadas con dije transparente.",
    image:
      "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=80",
    visible: true,
    inStock: false,
    backInStock: false,
  },
  {
    id: "demo-2",
    name: "Anillo cintillo cubic blanco",
    category: "Anillos",
    price: 12500,
    description: "Brillo sutil para todos los dias.",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80",
    visible: true,
    inStock: true,
    backInStock: true,
  },
  {
    id: "demo-3",
    name: "Collar punto de luz",
    category: "Collares",
    price: 10900,
    description: "Minimal, luminoso y facil de combinar.",
    image:
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
    visible: true,
    inStock: true,
    backInStock: false,
  },
];

const blankProduct = {
  name: "",
  category: "Aros",
  price: "",
  description: "",
  image: "",
  visible: true,
  inStock: true,
  backInStock: false,
};

const localKey = "las-marias-products";
const fallbackImage =
  "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=900&q=80";

function imagePath(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `products/${crypto.randomUUID()}.${extension}`;
}

function firebaseMessage(error) {
  if (error?.code === "storage/unauthorized") {
    return "Firebase no autorizo subir la foto. Revisa que estes con el Gmail admin.";
  }
  if (error?.code === "permission-denied") {
    return "Firebase no autorizo guardar el producto. Revisa el Gmail admin.";
  }
  return `No se pudo guardar: ${error?.code || error?.message || "error desconocido"}`;
}

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function readLocalProducts() {
  try {
    return JSON.parse(localStorage.getItem(localKey)) || seedProducts;
  } catch {
    return seedProducts;
  }
}

function writeLocalProducts(products) {
  localStorage.setItem(localKey, JSON.stringify(products));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("Todo");
  const [cartOpen, setCartOpen] = useState(false);
  const [adminView, setAdminView] = useState(
    window.location.pathname.startsWith("/admin")
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const adminAllowed =
    !firebaseReady || (user && adminEmail && user.email === adminEmail);

  useEffect(() => {
    if (!firebaseReady) {
      setUser({ displayName: "Demo", email: "demo@local" });
      return;
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    setLoading(true);

    if (!firebaseReady) {
      setProducts(readLocalProducts());
      setLoading(false);
      return;
    }

    const productsQuery =
      adminAllowed && user
        ? collection(db, "products")
        : query(collection(db, "products"), where("visible", "==", true));

    return onSnapshot(
      productsQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setProducts(next);
        setLoading(false);
      },
      () => {
        setNotice("No pude leer Firebase. Revisa reglas y variables.");
        setLoading(false);
      }
    );
  }, [adminAllowed, user]);

  const visibleProducts = adminView
    ? products
    : products.filter((product) => product.visible);

  const categories = useMemo(() => {
    return ["Todo", ...new Set(visibleProducts.map((item) => item.category))];
  }, [visibleProducts]);

  const shownProducts =
    category === "Todo"
      ? visibleProducts
      : visibleProducts.filter((item) => item.category === category);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(product) {
    if (!product.inStock) return;
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  }

  function changeQty(id, amount) {
    setCart((current) =>
      current
        .map((item) => ({ ...item, qty: item.id === id ? item.qty + amount : item.qty }))
        .filter((item) => item.qty > 0)
    );
  }

  function sendWhatsapp() {
    const lines = cart.map(
      (item) => `- ${item.name} x${item.qty} (${money(item.price * item.qty)})`
    );
    const text = `Hola Las Marias! Quiero consultar por:\n${lines.join(
      "\n"
    )}\n\nTotal estimado: ${money(total)}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`);
  }

  async function saveProduct(product, imageFile) {
    setSaving(true);
    setNotice("");

    try {
      let image = product.image;

      if (imageFile) {
        if (firebaseReady) {
          const imageRef = ref(storage, imagePath(imageFile));
          await uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
          image = await getDownloadURL(imageRef);
        } else {
          image = await fileToDataUrl(imageFile);
        }
      }

      const payload = {
        ...product,
        image,
        price: Number(product.price || 0),
        updatedAt: firebaseReady ? serverTimestamp() : Date.now(),
      };

      if (firebaseReady) {
        const { id, ...firebaseProduct } = payload;
        if (product.id) {
          await updateDoc(doc(db, "products", product.id), firebaseProduct);
        } else {
          await addDoc(collection(db, "products"), {
            ...firebaseProduct,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        const current = readLocalProducts();
        const next = product.id
          ? current.map((item) => (item.id === product.id ? payload : item))
          : [{ ...payload, id: crypto.randomUUID(), createdAt: Date.now() }, ...current];
        writeLocalProducts(next);
        setProducts(next);
      }

      setNotice("Producto guardado.");
    } catch (error) {
      console.error(error);
      setNotice(firebaseMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function patchProduct(id, patch) {
    const current = products.find((item) => item.id === id);
    if (!current) return;
    await saveProduct({ ...current, ...patch }, null);
  }

  async function removeProduct(product) {
    if (!confirm(`Borrar ${product.name}?`)) return;
    if (firebaseReady) {
      await deleteDoc(doc(db, "products", product.id));
    } else {
      const next = products.filter((item) => item.id !== product.id);
      writeLocalProducts(next);
      setProducts(next);
    }
  }

  async function login() {
    setNotice("");
    try {
      await signInWithPopup(auth, provider);
    } catch {
      setNotice("No pude iniciar sesion con Google.");
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={() => setAdminView(false)}>
          <img className="brand-logo" src="/logo-las-marias.png" alt="" aria-hidden="true" />
          <span>
            <strong>Las Marias</strong>
            <small>catalogo de joyas</small>
          </span>
        </a>
        <nav className="top-actions" aria-label="Acciones principales">
          <button className="ghost-button" onClick={() => setAdminView(!adminView)}>
            {adminView ? "Catalogo" : "Admin"}
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            Carrito <span>{cartCount}</span>
          </button>
        </nav>
      </header>

      <main>
        {!adminView ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">Las Marias</p>
                <h1>Joyas delicadas para elegir con calma.</h1>
                <p>
                  Mira el catalogo, suma tus favoritas y mandanos tu consulta por
                  WhatsApp. Simple, directo y sin vueltas.
                </p>
                <div className="hero-actions">
                  <a className="primary-link" href="#piezas">
                    Ver catalogo
                  </a>
                  <button
                    className="soft-button"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                          "Hola Las Marias! Quiero consultar por sus joyas."
                        )}`
                      )
                    }
                  >
                    Consultar
                  </button>
                </div>
              </div>
              <div className="hero-brand">
                <img src="/logo-las-marias.png" alt="Las Marias" />
                <span>piezas seleccionadas</span>
              </div>
            </section>

            <section className="catalog-section" id="piezas">
              <div className="section-head">
                <div>
                  <p className="eyebrow">catalogo</p>
                  <h2>Piezas disponibles</h2>
                </div>
                <span>{shownProducts.length} items</span>
              </div>

              <CategoryTabs
                categories={categories}
                active={category}
                onSelect={setCategory}
              />

              {loading ? (
                <p className="empty">Cargando catalogo...</p>
              ) : (
                <ProductGrid products={shownProducts} onAdd={addToCart} />
              )}
            </section>
          </>
        ) : (
          <AdminPanel
            user={user}
            products={products}
            saving={saving}
            notice={notice}
            adminAllowed={adminAllowed}
            onLogin={login}
            onLogout={() => signOut(auth)}
            onSave={saveProduct}
            onPatch={patchProduct}
            onRemove={removeProduct}
          />
        )}
      </main>

      <CartSheet
        open={cartOpen}
        cart={cart}
        total={total}
        onClose={() => setCartOpen(false)}
        onQty={changeQty}
        onSend={sendWhatsapp}
      />
    </div>
  );
}

function CategoryTabs({ categories, active, onSelect }) {
  return (
    <div className="tabs" role="tablist" aria-label="Categorias">
      {categories.map((item) => (
        <button
          key={item}
          className={item === active ? "active" : ""}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ProductGrid({ products, onAdd }) {
  if (!products.length) {
    return <p className="empty">Todavia no hay piezas en esta categoria.</p>;
  }

  return (
    <section className="product-grid" aria-label="Productos">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          <div className="photo-wrap">
            <img src={product.image || fallbackImage} alt={product.name} loading="lazy" />
            {!product.inStock && <span className="stock off">Sin stock</span>}
            {product.backInStock && product.inStock && (
              <span className="stock on">Volvio</span>
            )}
          </div>
          <div className="product-copy">
            <p>{product.category}</p>
            <h2>{product.name}</h2>
            <strong>{money(product.price)}</strong>
            {product.description && <small>{product.description}</small>}
          </div>
          <button
            className="add-button"
            disabled={!product.inStock}
            onClick={() => onAdd(product)}
          >
            {product.inStock ? "Sumar" : "Sin stock"}
          </button>
        </article>
      ))}
    </section>
  );
}

function CartSheet({ open, cart, total, onClose, onQty, onSend }) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="presentation">
      <aside className="cart-sheet" aria-label="Carrito">
        <div className="sheet-head">
          <div>
            <p className="eyebrow">tu seleccion</p>
            <h2>Carrito</h2>
          </div>
          <button className="ghost-button close-button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {cart.length ? (
          <>
            <div className="cart-list">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img src={item.image || fallbackImage} alt="" aria-hidden="true" />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{money(item.price)}</span>
                  </div>
                  <div className="qty">
                    <button aria-label={`Restar ${item.name}`} onClick={() => onQty(item.id, -1)}>
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button aria-label={`Sumar ${item.name}`} onClick={() => onQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Total estimado</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="whatsapp-button" onClick={onSend}>
              Enviar por WhatsApp
            </button>
          </>
        ) : (
          <p className="empty">Todavia no agregaste productos.</p>
        )}
      </aside>
    </div>
  );
}

function AdminPanel({
  user,
  products,
  saving,
  notice,
  adminAllowed,
  onLogin,
  onLogout,
  onSave,
  onPatch,
  onRemove,
}) {
  const [draft, setDraft] = useState(blankProduct);
  const [imageFile, setImageFile] = useState(null);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(draft, imageFile);
    setDraft(blankProduct);
    setImageFile(null);
    event.currentTarget.reset();
  }

  return (
    <section className="admin">
      <div className="admin-head">
        <div>
          <p className="eyebrow">panel privado</p>
          <h1>Administrar catalogo</h1>
          <p>Subi fotos, precios y stock. Lo visible aparece en la tienda.</p>
        </div>
        {firebaseReady && user ? (
          <button className="ghost-button" onClick={onLogout}>
            Salir
          </button>
        ) : null}
      </div>

      {!firebaseReady && (
        <p className="notice">
          Modo demo local: configura Firebase para guardar en produccion.
        </p>
      )}

      {firebaseReady && !user && (
        <button className="login-button" onClick={onLogin}>
          Entrar con Google
        </button>
      )}

      {firebaseReady && user && !adminAllowed && (
        <p className="notice">
          Este Gmail no tiene acceso al panel de Las Marias.
        </p>
      )}

      {adminAllowed && (
        <>
          <form className="product-form" onSubmit={submit}>
            <label>
              Nombre
              <input
                required
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Aros dije de cubic"
              />
            </label>
            <label>
              Categoria
              <input
                required
                value={draft.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="Aros"
              />
            </label>
            <label>
              Precio
              <input
                required
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.price}
                onChange={(event) => update("price", event.target.value)}
                placeholder="8900"
              />
            </label>
            <label className="span-2">
              Foto
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files[0])}
              />
            </label>
            <label className="span-2">
              Link de foto opcional
              <input
                value={draft.image}
                onChange={(event) => update("image", event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="span-2">
              Descripcion corta
              <textarea
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Detalle simple para la clienta"
              />
            </label>
            <div className="checks span-2">
              <Check
                label="Visible"
                checked={draft.visible}
                onChange={(value) => update("visible", value)}
              />
              <Check
                label="En stock"
                checked={draft.inStock}
                onChange={(value) => update("inStock", value)}
              />
              <Check
                label="Volvio"
                checked={draft.backInStock}
                onChange={(value) => update("backInStock", value)}
              />
            </div>
            <button className="save-button span-2" disabled={saving}>
              {saving ? "Guardando..." : draft.id ? "Guardar cambios" : "Agregar producto"}
            </button>
          </form>

          {notice && <p className="notice">{notice}</p>}

          <div className="admin-list">
            {products.map((product) => (
              <article className="admin-row" key={product.id}>
                <img src={product.image || fallbackImage} alt="" aria-hidden="true" />
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {product.category} · {money(product.price)}
                  </span>
                  <div className="mini-checks">
                    <Check
                      label="Visible"
                      checked={product.visible}
                      onChange={(value) => onPatch(product.id, { visible: value })}
                    />
                    <Check
                      label="Stock"
                      checked={product.inStock}
                      onChange={(value) => onPatch(product.id, { inStock: value })}
                    />
                    <Check
                      label="Volvio"
                      checked={product.backInStock}
                      onChange={(value) => onPatch(product.id, { backInStock: value })}
                    />
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setDraft(product);
                      scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Editar
                  </button>
                  <button className="danger-button" onClick={() => onRemove(product)}>
                    Borrar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
