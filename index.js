const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Middleware Function 
const logger = (request,response,next)=>{
    const authHeader = request.headers["authorization"];

    let jwtToken;

    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT TOKEN");
    } else {
      jwt.verify(jwtToken, "JWT_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT TOKEN");
        } else {
            request.username =payload.username
            next();
        }
      });
    }
    

}

//Get Profile API 
app.get('/profile/',logger,async(request,response)=>{
    const {username} = request
    const getUserProfile = `
    SELECT *
    FROM user 
    WHERE username = '${username}';`;
    const dbUser = await db.get(getUserProfile);
    response.send(dbUser)
    
})








// Get Books API
app.get("/books/",logger, async (request, response) => {
   const getBooksQuery =`
                SELECT *
                FROM book
                ORDER BY book_id;`;
                const booksArray = await db.all(getBooksQuery);
                response.send(booksArray)

});

//Get Book API 
app.get('/books/:bookId',async(request,response)=>{
    const {bookId} = request.params;
    const getBooksQuery =`
                SELECT *
                FROM book
                WHERE book_id=${bookId};`;
                const booksArray = await db.get(getBooksQuery);
                response.send(booksArray)
                
 
})


// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});


// User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
         const payload = {username:username}
        const jwtToken = jwt.sign(payload,"JWT_TOKEN");
       
        
      response.send({jwtToken});
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

