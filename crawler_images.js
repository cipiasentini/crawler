const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://strapi:strapi@localhost:27017/admin?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

const Crawler = require("crawler");
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

server = app.listen(5000, () => console.log(`Listening on 5000`))

app.get('/', (req,res) => {res.send("Hola")})

app.get('/res', (req,res) => {
    reschedule()
    res.send("OK")
})

const c = new Crawler({
    maxConnections : 10,
    rateLimit: 500,
    encoding:null,
    callback : async function (error, res, done) {
        console.log(`Ejecutando...`);

        if(error){
            console.log(error);
        }else{
            const $ = res.$;
            const obj = {}
            if ($("h1").text() != ""){
                try {
                    obj["acta"] = $("h1").text().match(/\d+/g).map(Number)[0];
                    obj.image = $("#logo img").attr("src")
                    if (obj.image != null) {
                      insertInDB(obj)
                    }
                }
                catch(e){
                    console.log(`Error: ${e}`);
                }
            }
        }
        done();
    }
});


client.connect(async(err) => {
    reschedule()
});

const reschedule = async () => {
    const start = await getMaxFromDB()
    const limit = 500

    console.log(`Schedulling from ${start}`);

    for (var i=start; i <= start + limit; i ++){
        console.log(`exist in db`);

        let exists = await existsInDB(i)

        if (exists){
            console.log(`${i} already exists in DB`);
        }
        else {
            console.log(`Enque ${i}`);
            if (i == start + limit){
                c.queue([{
                    uri: `https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`,
                    // The global callback won't be called
                    callback: function (error, res, done) {
                        done();
                        reschedule();
                    }
                }]);
            }
            else {
                c.queue(`https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`);
            }
        }
    }
}




const insertInDB = (obj) => client.db("admin").collection("brands_images").insertOne(obj).then(o => console.log(`${obj.acta} inserted in DB`)).catch(e => console.log(e))

const existsInDB = (id) => client.db("admin").collection("brands_images").findOne({"acta":id}).then(it => it != null)

const getMaxFromDB = () => client.db("admin").collection("brands_images").find().sort({acta: -1}).limit(1).toArray().then(it => it[0]?it[0].acta:2602480)

