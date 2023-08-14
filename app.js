const express = require("express");
const path = require("path");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());

const { format } = require("date-fns");
const { isValid } = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken = null;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);

    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);

        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const convertToCamel = (arrayed) => {
  return {
    id: arrayed.id,
    todo: arrayed.todo,
    priority: arrayed.priority,
    status: arrayed.status,
    category: arrayed.category,
    dueDate: arrayed.due_date,
  };
};

app.get("/todos/", async (request, response) => {
  try {
    const { priority, status, category, search_q } = request.query;
    let dbGetResponse = null;
    let getQuery = null;
    let unDef = null;
    if (status !== undefined && priority !== undefined) {
      getQuery = `SELECT * FROM todo 
       WHERE status = '${status}' AND priority = '${priority}';`;
    } else if (category !== undefined && priority !== undefined) {
      getQuery = `SELECT * FROM todo
        WHERE category ='${category}' AND priority ='${priority}';`;
    } else if (status !== undefined) {
      getQuery = `SELECT * FROM todo 
       WHERE status = '${status}';`;
      unDef = "Status";
    } else if (priority !== undefined) {
      getQuery = `SELECT * FROM todo 
       WHERE priority = '${priority}';`;
      unDef = "Priority";
    } else if (search_q !== undefined) {
      getQuery = `SELECT * FROM todo 
       WHERE todo LIKE '%${search_q}%'`;
    } else if (category !== undefined && status !== undefined) {
      getQuery = `SELECT * FROM todo 
       WHERE category ='${category}' && status='${status}';`;
    } else if (category !== undefined) {
      getQuery = `SELECT * FROM todo
        WHERE category ='${category}';`;
      unDef = "Category";
    }
    dbGetResponse = await db.all(getQuery);
    if (dbGetResponse[0] === undefined) {
      response.status(400);
      response.send(`Invalid Todo ${unDef}`);
    } else {
      response.send(dbGetResponse.map((arran) => convertToCamel(arran)));
    }
  } catch (e) {
    console.log(e.message);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const getQuery = `SELECT *FROM todo 
        WHERE id = ${todoId};`;
    const dbResponse = await db.get(getQuery);
    response.send({
      id: dbResponse.id,
      todo: dbResponse.todo,
      priority: dbResponse.priority,
      status: dbResponse.status,
      category: dbResponse.category,
      dueDate: dbResponse.due_date,
    });
  } catch (e) {
    console.log(e.message);
  }
});

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;

    const dateFormat = format(new Date(date), "yyyy-MM-dd");
    console.log(dateFormat);
    const agendaQuery = `SELECT * FROM todo WHERE due_date = '${dateFormat}';`;
    const agendaResponse = await db.all(agendaQuery);
    const unDif = "Due Date";
    if (agendaResponse[0] === undefined) {
      response.status(400);
      response.send(`Invalid Due Date`);
    } else {
      response.send(agendaResponse.map((arran) => convertToCamel(arran)));
    }
  } catch (e) {
    console.log(e.message);
  }
});

app.post("/todos/", async (request, response) => {
  try {
    const { id, todo, priority, status, category, dueDate } = request.body;
    const dateFormat = format(new Date(dueDate), "yyyy-MM-dd");
    console.log(dateFormat);
    const postQuery = `INSERT INTO todo(id,todo,category,priority,status,due_date)
        VALUES(${id},'${todo}','${category}','${priority}','${status}','${dateFormat}');`;
    const dbResponse = await db.run(postQuery);
    response.send("Todo Successfully Added");
  } catch (e) {
    console.log(e.message);
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const { status, priority, todo, category, dueDate } = request.body;
    let putQuery = null;
    let dbPutResponse = null;
    let dbResponseSend = null;
    if (status !== undefined) {
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        putQuery = `UPDATE todo SET
       status ='${status}' 
       WHERE id =${todoId};`;
        dbResponseSend = "Status Updated";
      } else if (status === null) {
        response.status(400);
        dbResponseSend = "Invalid Todo Status";
      }
    } else if (priority !== undefined) {
      putQuery = `UPDATE todo SET
       priority ='${priority}' 
       WHERE id =${todoId};`;
      dbResponseSend = "Priority Updated";
    } else if (todo !== undefined) {
      putQuery = `UPDATE todo SET
       todo ='${todo}' 
       WHERE id =${todoId};`;
      dbResponseSend = "Todo Updated";
    } else if (category !== undefined) {
      putQuery = `UPDATE todo SET
       category ='${category}' 
       WHERE id =${todoId};`;
      dbResponseSend = "Category Updated";
    } else if (dueDate !== undefined) {
      const dateFormat = format(new Date(dueDate), "yyyy-MM-dd");
      console.log(dateFormat);
      putQuery = `UPDATE todo SET
       due_date ='${dateFormat}' 
       WHERE id =${todoId};`;
      dbResponseSend = "Due Date Updated";
    }
    dbPutResponse = await db.run(putQuery);
    console.log(dbPutResponse);
    response.send(dbResponseSend);
  } catch (e) {
    console.log(e);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const deleteQuery = `DELETE FROM todo WHERE id =${todoId};`;
    const dbResponse = await db.run(deleteQuery);
    response.send("Todo Deleted");
  } catch (e) {
    console.log(e.message);
  }
});

module.exports = app;
