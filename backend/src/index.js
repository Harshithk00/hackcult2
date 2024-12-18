import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from './config/db.js';
import bcrypt from 'bcrypt'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import verifyToken from "./verifyToken.js";


 dotenv.config();
 const app = express();

// console.log(process.env.DB_DATABASE)
const port = process.env.PORT || 8000;

app.use(cookieParser());
app.use(express.json({ limit: "500mb" })); // JSON payloads
app.use(express.urlencoded({ limit: "500mb", extended: true })); 


app.use(cors({
    origin: 'http://localhost:5173', // Your React frontend URL
    credentials: true, // Allow credentials (cookies)
  }));


app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT current_database()");
        res.send(`The database name is: ${result.rows[0].current_database}`);
    } catch (error) {
        console.error("Error executing query:", error.stack);
        if (error.code === 'ECONNRESET') {
            return res.status(500).send("Database connection was reset. Please try again.");
        }
        res.status(500).send("Error querying the database.");
    }
});

const saltRounds = 10;

app.post('/api/signup', async (req, res) => {
    const { fullName, email, password } = req.body;
    console.log(req.body)
    try {
        // Check if user already exists based on name
        const checkResult = await pool.query("SELECT * FROM users WHERE name = $1", [fullName]);

        if (checkResult.rows.length > 0) {
            // If user exists, redirect to home
            res.redirect("/");
        } else {
            // Ensure password is provided
            if (!password) {
                console.error("Password is required");
                return res.status(400).send("Password is required");
            }

            // Hash the password using bcrypt
            const hash = await bcrypt.hash(password, saltRounds);
            console.log(hash)
            // Insert the new user into the database
            const result = await pool.query(
                "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
                [fullName, email, hash]
            );
            
            const user = result.rows[0];

            // Redirect after successful signup
            res.redirect("/");
        }
    } catch (err) {
        console.error(err);
    }
});



//login

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query the database to find the user by email
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }

        const user = result.rows[0];
        const storedPassword = user.password_hash;
         console.log(user,password)
        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, storedPassword);
       
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid password" });
        }

        // Create JWT token upon successful login
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.cookie('token', token, {
            httpOnly: true,  // Prevents client-side JS from accessing the cookie
            secure: process.env.NODE_ENV === 'production', // Use secure in production  
            maxAge: 3600000, // 1 hour expiration
            sameSite: 'strict', // Allows cross-origin requests
          });
          
           
        // res.cookie("token", token, { // Prevents JavaScript from accessing the cookie
        //     ma   xAge: 3600000, // 1 hour
        // });


        // Return user data and token in the response
        return res.json({status:200,  token });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});



//upload file
app.post("/api/upload",verifyToken, async (req, res) => {
    try {
        // Parse the incoming request body
        const { encryptedData, fileExtension } = req.body;
        // console.log(encryptedData)
       
        const user_id = 1;
        const ownerEmail = "a@a.com";
        const tempEmail = "a@a.com"
        const filename = "1"
       
        console.log(1)
        if (!fileExtension || !ownerEmail || !encryptedData) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Convert encryptedData from base64 to Buffer (if sent as base64)
        
        // const encryptedDataArray = new Uint8Array(Object.values(encryptedData));
        // const encryptedDataBuffer = Buffer.from(encryptedDataArray, "base64");
        // console.log(encryptedDataArray)
        // Insert file information into the database
        
        console.log(filename, encryptedData, user_id, ownerEmail, tempEmail, fileExtension)
        const result = await pool.query(
            "INSERT INTO files (filename, file_data, user_id, owner_email,temp_email, extention) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [filename, encryptedData, user_id, ownerEmail, tempEmail, fileExtension]
        );
        // const result = await pool.query(
        //     "INSERT INTO files (filename, file_data, user_id, owner_email, temp_email, extension) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        //     [fileName, encryptedDataArray, user_id, ownerEmail, tempEmail, fileExtension]
        // );
        
        console.log(result)

        // Respond with the inserted file data
        res.status(201).json({ message: "File uploaded successfully", file: result.rows[0] });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.post("/api/upload/details", verifyToken, async (req, res) => {
    try {
        const { temp_email, filename } = req.body;
        const userId = req.userId; // Get userId from the verified token
        const userEmail = req.userEmail; // Get userEmail from the verified token
        
        // Check if the temp_email exists in your system (optional)
        if (!temp_email || !filename) {
            return res.status(400).json({ error: "Missing temp_email or filename" });
        }

        // Insert into the 'files' table
        const query = `
            INSERT INTO files (user_id, temp_email, filename)
            VALUES ($1, $2, $3) RETURNING *;
        `;

        // Execute the query with user ID, email, temp_email, and filename
        const result = await pool.query(query, [userId, temp_email, filename]);

        // Send success response with the inserted file details
        return res.json({
            status: 200,
            message: "File details added successfully",
            file: result.rows[0], // Return the inserted file record
        });

    } catch (error) {
        console.error("Error adding file details:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

  app.post("/api/download",verifyToken, async (req,res)=>{
    const {id}= req.body
    // const id = 16;
    const result = await pool.query(
        "SELECT * FROM files WHERE id = $1",
        [id]
    );
    res.send(result.rows[0].file_data)
    // res.send(result.rows[0].extention)
    console.log(result.rows[0].file_data);
})

app.post("/api/verify-token",verifyToken, async (req,res)=>{
    const {userId, userEmail} = req.body;
    res.status(200).json({userId, userEmail})
})


app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});
