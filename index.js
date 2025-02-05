require('dotenv').config();
const cors = require('cors')
const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qkg2o.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const dbCollection = client.db('hostelManagement')

    const mealsCollection = dbCollection.collection('meals');
    const packageCollection = dbCollection.collection('packeges');
    const userCollection = dbCollection.collection('users');

    // meals API
    app.get('/meals', async (req,res)=>{
        const result = await mealsCollection.find().toArray();
        res.send(result)
    })
    app.get('/meals/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await mealsCollection.findOne(query);
        res.send(result)
    })
    app.patch('/meals/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const likedData = req.body
        const updatedDoc = {
          $set: {
              like: likedData.like
          }
        }
        const result = await mealsCollection.updateOne(filter,updatedDoc);
        res.send(result)
    })

    // Packages API
    app.get('/packages', async (req,res)=>{
      const result = await packageCollection.find().toArray();
      res.send(result)
    })

    // user API
    app.post('/users', async(req,res)=>{
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('Server is running')
})

app.listen(port, ()=>{
    console.log(`server is running on ${port}`)
})