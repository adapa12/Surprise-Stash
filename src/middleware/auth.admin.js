'use strict'

const jwt = require('jsonwebtoken')

module.exports = function(req,res,next){
    const token = req.header('x-auth-token');
    if(!token) return res.status(401).send('Access denied. No token provided')

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET,{ignoreExpiration : true});
        req.user = decoded;
        req.user.token = token;

        if(decoded.role == 'management'){
            next()
        }else{
            return res.status(400).send("Permission denied");
        }
      
    }catch(err){
        return res.status(400).send('Invalid token')
    }
}