import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";

const DATA_FILE = path.join(process.cwd(), "data.json");
const PORT = 3000;
const ADMIN_ID = "9389927711";
const ADMIN_PASS = "AiwaJaat@11";
const ADMIN_TOKEN = "admin_secret_token_123";

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return { posts: [], settings: { adScript: "", adDelay: 5 } };
  }
}

async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Simple auth middleware for protected routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    if (token === `Bearer ${ADMIN_TOKEN}`) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Auth Endpoint
  app.post("/api/auth", (req, res) => {
    const { id, password } = req.body;
    if (id === ADMIN_ID && password === ADMIN_PASS) {
      res.json({ token: ADMIN_TOKEN });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Data Endpoints
  app.get("/api/posts", async (req, res) => {
    const data = await readData();
    // Sort by createdAt descending
    const posts = data.posts.sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const data = await readData();
    const post = data.posts.find((p: any) => p.id === req.params.id);
    if (post) res.json(post);
    else res.status(404).json({ error: "Not found" });
  });

  app.post("/api/posts", requireAdmin, async (req, res) => {
    const data = await readData();
    const newPost = {
      ...req.body,
      id: uuidv4(),
      createdAt: Date.now()
    };
    data.posts.push(newPost);
    await writeData(data);
    res.json(newPost);
  });

  app.put("/api/posts/:id", requireAdmin, async (req, res) => {
    const data = await readData();
    const index = data.posts.findIndex((p: any) => p.id === req.params.id);
    if (index !== -1) {
      data.posts[index] = { ...data.posts[index], ...req.body };
      await writeData(data);
      res.json(data.posts[index]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/posts/:id", requireAdmin, async (req, res) => {
    const data = await readData();
    data.posts = data.posts.filter((p: any) => p.id !== req.params.id);
    await writeData(data);
    res.json({ success: true });
  });

  app.get("/api/settings", async (req, res) => {
    const data = await readData();
    res.json(data.settings);
  });

  app.put("/api/settings", requireAdmin, async (req, res) => {
    const data = await readData();
    data.settings = { ...data.settings, ...req.body };
    await writeData(data);
    res.json(data.settings);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4.x, this must be `*`. We have Express 4.21.2.
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
