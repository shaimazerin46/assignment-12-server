require('dotenv').config();
const cors = require('cors')
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_KEY)
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
    const upomingMealsCollection = dbCollection.collection('upcomingMeals')
    const packageCollection = dbCollection.collection('packeges');
    const userCollection = dbCollection.collection('users');
    const paymentCollection = dbCollection.collection('packagePayments');
    const requestedMealCollection = dbCollection.collection('requestedMeal');
    const reviewCollection = dbCollection.collection('reviews');

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "bdt",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // payment related API
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      console.log("payment info: ", payment)
      res.send(result)
    })

    // meals API
    app.get('/meals', async (req, res) => {
      const { search, category, minPrice, maxPrice} = req.query;
      let filter = {};
      if (search) {
        filter.title = { $regex: search, $options: "i" }; //Uses MongoDB's $regex (Regular Expression) to match meal titles containing the search text, Makes the search case-insensitive 
      }
      if (category) {
        filter.category = category; 
    }
    
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);//Adds $gte (Greater Than or Equal To) condition
        
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);//Adds $lte (Less Than or Equal To) condition
      }
      const result = await mealsCollection.find(filter).toArray();
    
      res.send(result)
    })
    app.get('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mealsCollection.findOne(query);
      res.send(result)
    })
    app.post('/meals', async (req,res)=>{
      const mealItem = req.body;
      const result = await mealsCollection.insertOne(mealItem);
      res.send(result)
    })
  
  app.patch('/meals/:id', async (req, res) => {
    const id = req.params.id;
    const { like, reviewsCount, title, category, description, ingredients, price, image } = req.body;
    const filter = { _id: new ObjectId(id) };

    const updateFields = {};


    if (like !== undefined) {
        updateFields.like = like;
    }
    if (reviewsCount !== undefined) {
        updateFields.reviewCount = reviewsCount;
    }
    if (title) {
        updateFields.title = title;
    }
    if (category) {
        updateFields.category = category;
    }
    if (description) {
        updateFields.description = description;
    }
    if (ingredients) {
        updateFields.ingredients = ingredients;
    }
    if (price !== undefined) {
        updateFields.price = parseInt(price);
    }
    if (image) {
        updateFields.image = image;
    }

    const updatedDoc = { $set: updateFields };

    
        const result = await mealsCollection.updateOne(filter, updatedDoc);
        res.send(result);
   
});

    app.delete('/meals/:id',async (req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await mealsCollection.deleteOne(filter);
      res.send(result)
    })

    // upcoming meals
    app.get('/upcomingMeals', async (req,res)=>{
    
      const result = await upomingMealsCollection.find().toArray();
      res.send(result)
    })
    app.patch('/upcomingMeals/:id', async (req,res)=>{
      const id = req.params.id;
      const like = req.body
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedDoc = {
        $set: like
      }
      const result = await upomingMealsCollection.updateOne(filter,updatedDoc,options);
      res.send(result)
    })

    // Packages API
    app.get('/packages', async (req, res) => {
      const result = await packageCollection.find().toArray();
      res.send(result)
    })

    // user API
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result)
    })
    app.get('/users', async (req, res) => {
      const { search } = req.query;
      let filter = {};
      if (search) {
        filter = {
            $or: [
                { name: { $regex: search, $options: "i" } }, 
                { email: { $regex: search, $options: "i" } }
            ]
        };
    }
      const result = await userCollection.find(filter).toArray();
      res.send(result)
    })
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const badge = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: badge
      }
      const result = await userCollection.updateOne(filter, updatedDoc, options)
      res.send(result)

    })
    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc ={
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc);
      res.send(result)
    })

    // meal request api
    app.post('/requestedMeal', async (req, res) => {
      const requestedMeal = req.body;
      const result = await requestedMealCollection.insertOne(requestedMeal);
      res.send(result)
    })
    app.get('/requestedMeal', async (req,res)=>{
      const search = req.query.search || "";
      const query = search
            ? { title: { $regex: search, $options: "i" } } 
            : {};
      const result = await requestedMealCollection.find(query).toArray();
      res.send(result)
    })
    app.patch('/requestedMeal/:id', async (req,res)=>{
      const id = req.params.id;
      const { status } = req.body;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: { status: status }
      }
      const result = await requestedMealCollection.updateOne(filter,updatedDoc);
      res.send(result)
    })

    // review api
    app.post('/reviews', async (req, res) => {
      const reviewData = req.body;
      console.log(reviewData)
      const result = await reviewCollection.insertOne(reviewData);
      res.send(result)
    })
    app.get('/reviews', async (req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })
    app.delete('/reviews/:id', async (req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await reviewCollection.deleteOne(filter);
      res.send(result)
    })
    

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running')
})

app.listen(port, () => {
  console.log(`server is running on ${port}`)
})