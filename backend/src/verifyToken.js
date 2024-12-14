import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables from the `.env` file
dotenv.config();

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
    const token = req.cookies.token; // Extract the token from cookies

    if (!token) {
        return res.status(401).json({ error: "You are not authenticated" });
    }

    jwt.verify(token, process.env.SECRET, (err, data) => {
        if (err) {
            return res.status(403).json({ error: "Token is invalid" });
        }

        // Attach both `id` and `email` to the request object
        req.userId = data.id;
        req.userEmail = data.email;
        next(); // Pass control to the next middleware or route handler
    });
};
export default verifyToken
