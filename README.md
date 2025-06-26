# FiberX DBMS ORM

**FiberX DBMS ORM** is a lightweight, extensible, and database-agnostic ORM and query builder built with Node.js. It currently supports **MySQL** and **PostgreSQL**, with future plans to support more relational and non-relational databases.

---

## 🚀 Features

- 🔌 **Pluggable Datasource Registry** – Easily register and switch between data sources
- 🧩 **Custom Datatype Mapping** – Define schema types tailored to each database
- 🧱 **Flexible Base Models** – Extendable base classes for SQL/NoSQL models
- 🔧 **Query Builder** – Chainable, readable, and optimized query generation
- ⚙️ **Utility Modules** – Global event handling, logging, and variable management
- 🗂️ **Modular Design** – Clean folder structure for maintainability and scalability

---

## 📦 Installation

```bash
npm install fiberx-dbms-orm
````

---

## 📁 Project Structure

```text
fiberx-dbms-orm/
├── app.js                  # Entry point to expose key modules
├── datasource/             # Data source connectors, registry, and mapping
├── datatype/               # Database-specific datatype mapping
├── model/                  # Base models, mappers, utilities
├── query_builder/          # Query builders and utilities for SQL engines
├── utils/                  # Event system, logger, global variable manager
└── package.json
```

---

## 🔧 Usage Example

```js
// app.js exposes registry, model, and utilities
const { registerDataSource, getRegisteredSources } = require('./datasource/registry/datasource_registry');
const { DataTypes } = require('./datatype');
const { BaseModel } = require('./model/base/sql_base_model');

// Register a MySQL data source
registerDataSource('main_db', {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'fiberx_db',
});

// Define a User model
class User extends BaseModel {
  static schema = {
    id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    email: DataTypes.STRING,
  };
}

// Use the model
(async () => {
  const users = await User.findAll();
  console.log(users);
})();
```

---

## 🧱 Module Highlights

### 📌 Data Source Registry

```js
const { registerDataSource } = require('./datasource/registry/datasource_registry');
```

* Register MySQL or PostgreSQL sources dynamically

### 📌 Datatype Mapper

```js
const { DataTypes } = require('./datatype');
```

* Maps ORM-level types to driver-specific types

### 📌 Base Model Mapper

```js
const { mapModelToTable } = require('./model/mapper/base_model_mapper');
```

* Handles model-schema-to-table mapping

### 📌 Query Builder

```js
const { MySQLQueryBuilder } = require('./query_builder/builder/mysql_query_builder');
```

* Custom builders per database engine

---

## 🛠️ Roadmap

* [ ] Add SQLite and MongoDB support
* [ ] Implement validation rules
* [ ] Add migrations
* [ ] CLI tool for model scaffolding

---

## 🤝 Contributing

We welcome contributions! Feel free to fork the repo, open issues, or submit PRs.

### Development

```bash
npm install
npm run lint
npm run format
```

---

## 📝 License

MIT © [FiberX Innovations LTD.](https://github.com/fiberx-innovations)

---

## 📬 Support & Feedback

* Report bugs: [GitHub Issues](https://github.com/fiberx-innovations/fiberx-dbms-orm/issues)
* Email: [support@fiberxinnovationc.com](mailto:support@fiberxinnovationc.com) *(example email)*

```

