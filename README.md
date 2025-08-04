
# FiberX DBMS TypeScript ORM

> A modern, TypeScript-first ORM and query builder for Node.js — powering the FiberX Innovations ecosystem. Supports **MySQL** and **PostgreSQL**, with extensibility for other relational and NoSQL databases.

---

## 🚀 Features

- 🔌 **Pluggable Data Source Registry** – Dynamically register, configure, and manage data sources
- 🧠 **Smart Datatype Mapper** – Typed, cross-database schema definitions
- 🧱 **Extensible Base Models** – Create rich models for SQL and NoSQL
- 🧰 **Modular Query Builders** – Optimized, composable SQL query generation
- 🛠️ **Utilities** – Built-in logging, event systems, UUID generators, and more
- ⚙️ **Code Generation** – Bootstrap utilities for model and schema scaffolding

---

## 📦 Installation

Install directly from GitHub:

```bash
npm install fiberx-innovations/fiberx-dbms-orm
````

---

## 📁 Directory Structure

```text
fiberx-dbms-orm/
├── src/
│   ├── base_models/             # Base SQL/NoSQL models
│   ├── data_sources/            # Connectors, mappers, registry
│   ├── data_type/               # Data type definitions & mapping
│   ├── query_builders/          # SQL query builders
│   ├── scripts/                 # Code generation and bootstrapping
│   ├── templates/               # Model templates
│   ├── types/                   # Shared TypeScript types
│   └── utils/                   # Logger, events, UUID, etc.
├── dist/                        # Transpiled output (ignored in dev)
├── app.ts                       # Entry point module
├── tsconfig.json
└── package.json
```

---

## 🧠 Usage Example (TypeScript)

```ts
import Fiberx from 'fiberx-dbms-orm';

const {
  BaseSQLModel,
  DataTypes,
  DataSourceRegistry
} = Fiberx;

// Register a MySQL data source
DataSourceRegistry.register({
  id: 'default',
  type: 'mysql',
  config: {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'fiberx_db',
  },
});

// Define a model
class User extends BaseSQLModel {
  static table = 'users';

  static schema = {
    id: DataTypes.UUID(),
    name: DataTypes.STRING(100),
    email: DataTypes.STRING(),
    created_at: DataTypes.DATE(),
  };
}

// Query with the model
(async () => {
  const results = await User.findAll({
    where: { name: 'Admin' }
  });
  console.log(results);
})();
```

---

## 🔍 Module Highlights

### 📌 Data Source Registry

```ts
import { DataSourceRegistry } from 'fiberx-dbms-orm';

DataSourceRegistry.register({ id: 'pg', type: 'postgres', config: { ... } });
```

### 📌 Data Types

```ts
import { DataTypes } from 'fiberx-dbms-orm';

const schema = {
  id: DataTypes.INTEGER(),
  name: DataTypes.STRING(50),
};
```

### 📌 Query Builders

```ts
import { BaseQueryBuilder } from 'fiberx-dbms-orm';

```

---

## 📜 Scripts

| Script          | Description                |
| --------------- | -------------------------- |
| `npm run build` | Transpile TypeScript to JS |
| `npm run lint`  | Run linter (if configured) |
| `npm run test`  | Run tests (coming soon)    |

---

## 🗺️ Roadmap

* [ ] Add Postgres Query builder and MongoDB support
* [ ] CLI scaffolding tool
* [ ] Advanced model relationships
* [ ] Skip validations

---

## 🤝 Contributing

We welcome contributions from the community!

### Dev Setup

```bash
git clone https://github.com/fiberx-innovations/fiberx-dbms-orm.git
cd fiberx-dbms-orm
npm install
npm run build
```

---

## 📬 Support & Feedback

* 📂 [GitHub Issues](https://github.com/fiberx-innovations/fiberx-dbms-orm/issues)
* 📧 Email: [support@fiberxinnovations.com](mailto:support@fiberxinnovations.com)

---

## 📝 License

ISC © 2025 [FiberX Innovations Ltd.](https://github.com/fiberx-innovations)

