// const MongoClient = require('mongodb').MongoClient;
// const uri = "mongodb://strapi:strapi@localhost:27017/admin?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

const Crawler = require("crawler");
const slugify = require('slugify');
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

server = app.listen(process.env.PORT || 4000, () => console.log(`Listening on ${process.env.PORT || 4000}`))

app.get('/', (req,res) => {res.send("Hola")})

app.get('/res', (req,res) => {
    reschedule()
    res.send("OK")
})

const c = new Crawler({
    maxConnections : 10,
    rateLimit: 500,
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
                    $("label.input").each((i, elem) => {
                        let text = $(elem).find("span").text().trim()
                        let fieldName = elem.childNodes[0].nodeValue.trim()
                        
                        if (text == "") {
                            text = fieldName.split(":")[1]
                            fieldName = fieldName.split(":")[0]
                        }
                        
                        fieldName = slugify(fieldName.replace(":","").replace("\.",""), "_")
                        
                        if (fieldName.length > 0){
                            obj[fieldName] = text.trim()
                        }
                    })

                    // **** SCRIPTS DE LA WEB ****

                    let text = $($('script')).text();

                    // **** OPOSICIONES TABLA DESDE VARIABLE JS ****

                    let list_oposiciones = [];
                    let var_ops = obtenerValorVariableJS(text,"var opos = ");
                    let oposiciones = eval(var_ops);
                    oposiciones.forEach(oposicion => {
                        let n_op = {};
                        for (var prop in oposicion) {
                            if (Object.prototype.hasOwnProperty.call(oposicion, prop)) {
                                try {
                                    n_op[prop] = getFormattedVals(oposicion[prop]);
                                } catch {
                                    n_op[prop] = oposicion[prop];
                                }
                            }
                        }
                        list_oposiciones.push(n_op);
                    });
                    obj["OPOSICIONES"] = list_oposiciones;

                    // **** VISTAS TABLA DESDE VARIABLE JS ****
                    let list_vistas = [];
                    var var_vis = obtenerValorVariableJS(text,"var vistas = ");
                    var vistas = eval(var_vis);
                    vistas.forEach(vista => {
                        let n_vis = {};
                        for (var prop in vista) {
                            if (Object.prototype.hasOwnProperty.call(vista, prop)) {
                                try {
                                    n_vis[prop] = getFormattedVals(vista[prop]);
                                } catch {
                                    n_vis[prop] = vista[prop];
                                }
                            }
                        }
                        list_vistas.push(n_vis);
                    });
                    obj["VISTAS"] = list_vistas;

                    insertInDB(obj)

                    // let oposiciones = []
                    // let op_obj = {}
                    // // Crea el objeto de claves vacias
                    // $("#tblGrillaopos > thead > tr > th").each((i, elem) => {
                    //     let campo = elem.childNodes[0].nodeValue.trim()
                    //     campo = slugify(campo.replace(":","").replace("\.",""), "_")
                    //     op_obj[campo] = ""
                    // })

                    // // Asigna valores a los objetos, 1..n 1..n oposiciones
                    // $("#tblGrillaopos > tbody > tr").each((i, elem) => {
                    //     let new_opo = op_obj
                    //     let vals = []
                    //     $(elem).children('td').each((j, op) => {
                    //         let valor = $(op).html().trim()
                    //         vals.push(valor)
                    //     })
                    //     let index = 0;
                    //     for (var prop in new_opo) {
                    //         if (Object.prototype.hasOwnProperty.call(new_opo, prop)) {
                    //             new_opo[prop] = valor[index]
                    //         }
                    //         index++
                    //     }
                    //     oposiciones.push(new_opo)
                    // })

                    // // **** VISTAS TABLA ****
                    // let vistas = []
                    // let view_obj = {}
                    
                    // // Crea el objeto de claves vacias
                    // $("#tblGrillaVistas > thead > tr > th").each((i, elem) => {
                    //     let campo = elem.childNodes[0].nodeValue.trim()
                    //     campo = slugify(campo.replace(":","").replace("\.",""), "_")
                    //     view_obj[campo] = ""
                    // })

                    // // Asigna valores a los objetos, 1..n vistas
                    // $("#tblGrillaVistas > tbody > tr").each((i, elem) => {
                    //     let new_view = view_obj
                    //     let vals = []
                    //     $(elem).children('td').each((j, v) => {
                    //         let valor = $(v).html().trim()
                    //         vals.push(valor)
                    //     })
                    //     let index = 0;
                    //     for (var prop in new_view) {
                    //         if (Object.prototype.hasOwnProperty.call(new_view, prop)) {
                    //             new_view[prop] = valor[index]
                    //         }
                    //         index++
                    //     }
                    //     vistas.push(new_view)
                    // })
                    // insertInDB(obj)
                }
                catch(e){
                    console.log(`Error: ${e}`);
                }
            }
        }
        done();
    }
});

function obtenerValorVariableJS(target, variable){
    var recortar = target.substring(target.search(variable)+variable.length,target.length);
    var result = recortar.substring(0,recortar.search(";"));
    return result;
}

function getFormattedVals(possible_string_date) {
    if (possible_string_date != "" || possible_string_date != undefined || possible_string_date != null) {
        // me fijo si no es un numero primero
        var possible_number = parseInt(possible_string_date.slice(1,-1));
        if (!isNaN(possible_number)) {
            return possible_string_date
        }
        var date = possible_string_date.slice(6, -2); // si puede hacer esto es o bien fecha (valida, invalida), o bien string
        date = parseInt(date)
        // es string, devuelvo tal cual
        if (isNaN(date)) {
            return possible_string_date;
        }
        // no posee fecha (da negativo cuando no tiene en el script de la web)
        if (date < 0) {
            return ""
        }
        
        date = new Date(date);
        var year = date.getFullYear();
        
        var month = (1 + date.getMonth()).toString();
        month = month.length > 1 ? month : '0' + month;
        
        var day = date.getDate().toString();
        day = day.length > 1 ? day : '0' + day;
        
        return year + '-' + month + '-' + day;
    }
    return possible_string_date
}

const reschedule = async () => {
    // c.queue([{
    //     uri: 'https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=2602501',
    //     callback: function (error, res, done) {
    //         done();
    //     }
    // }]);
    c.queue('https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=2602501');
}

// client.connect(async(err) => {
//     reschedule()
// });

// const reschedule = async () => {
//     const start = await getMaxFromDB()
//     const limit = 500

//     console.log(`Schedulling from ${start}`);

//     for (var i=start; i <= start + limit; i ++){
//         console.log(`exist in db`);

//         let exists = await existsInDB(i)

//         if (exists){
//             console.log(`${i} already exists in DB`);
//         }
//         else {
//             console.log(`Enque ${i}`);
//             if (i == start + limit){
//                 c.queue([{
//                     uri: `https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`,
//                     // The global callback won't be called
//                     callback: function (error, res, done) {
//                         done();
//                         reschedule();
//                     }
//                 }]);
//             }
//             else {
//                 c.queue(`https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`);
//             }
//         }
//     }
// }




// const insertInDB = (obj) => client.db("admin").collection("brands").insertOne(obj).then(o => console.log(`${obj.acta} inserted in DB`)).catch(e => console.log(e))

// const existsInDB = (id) => client.db("admin").collection("brands").findOne({"acta":id}).then(it => it != null)

// //const getMaxFromDB = () => client.db("test").collection("brands").find().sort({acta: -1}).limit(1).toArray().then(it => it[0].acta)
// const getMaxFromDB = () => client.db("admin").collection("brands").find().sort({acta: -1}).limit(1).toArray().then(it => it[0]?it[0].acta:1014099)

