const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://strapi:strapi@localhost:27017/admin?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

const Crawler = require("crawler");
const slugify = require('slugify');
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

server = app.listen(process.env.PORT || 4000, () => console.log(`Listening on ${process.env.PORT || 3000}`))

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
                    // obj.image = $("#logo img").attr("src")
                    $("label.input").each((i, elem) => {
                        let text = $(elem).find("span").text().trim()
                        let fieldName = elem.childNodes[0].nodeValue.trim()
                        
                        if (text == "") {
                            text = fieldName.split(":")[1]
                            fieldName = fieldName.split(":")[0]
                        }
                        
                        fieldName = slugify(fieldName.replace(":","").replace("\.",""), "_")
                        
                        if (fieldName.length > 0){
                            let formatted_field = text.trim()
                            try {
                                formatted_field = formatFromSpan(text.trim())
                            } catch (e) {
                                console.log(e)
                                formatted_field = text.trim()
                            }
                            obj[fieldName] = formatted_field
                        }
                    })

                    // **** SCRIPTS DE LA WEB ****

                    let text = $($('script')).text();

                    // **** OPOSICIONES TABLA DESDE VARIABLE JS ****

                    let list_oposiciones = [];
                    let var_ops = getValueVariableJS(text,"var opos = ");
                    let oposiciones = eval(var_ops);
                    oposiciones.forEach(oposicion => {
                        let n_op = {};
                        for (var prop in oposicion) {
                            if (Object.prototype.hasOwnProperty.call(oposicion, prop)) {
                                let fieldName = prop.toUpperCase();
                                try {
                                    n_op[fieldName] = getFormattedVals(oposicion[prop]);
                                } catch {
                                    n_op[fieldName] = oposicion[prop];
                                }
                            }
                        }
                        list_oposiciones.push(n_op);
                    });
                    obj["OPOSICIONES"] = list_oposiciones;

                    // **** VISTAS TABLA DESDE VARIABLE JS ****
                    let list_vistas = [];
                    var var_vis = getValueVariableJS(text,"var vistas = ");
                    var vistas = eval(var_vis);
                    vistas.forEach(vista => {
                        let n_vis = {};
                        for (var prop in vista) {
                            if (Object.prototype.hasOwnProperty.call(vista, prop)) {
                                let fieldName = prop.toUpperCase();
                                try {
                                    n_vis[fieldName] = getFormattedVals(vista[prop]);
                                } catch {
                                    n_vis[fieldName] = vista[prop];
                                }
                            }
                        }
                        list_vistas.push(n_vis);
                    });
                    obj["VISTAS"] = list_vistas;

                    // esto lo hago solo para mi
//                    if (obj["VISTAS"].length != 0 || obj["OPOSICIONES"].length != 0) {
                    insertInDB(obj)
 //                   }
                }
                catch(e){
                    console.log(`Error: ${e}`);
                }
            }
        }
        done();
    }
});

// si tiene espacios en blanco entonces retorna NaN
function parseIntStrict(stringValue) { 
  if ( /^[\d\s]+$/.test(stringValue) )  
  {
    return parseInt(stringValue);
  }
  else
  {
    return NaN;
  }
}

function formatFromSpan(possible_string_date) {

  // puede ser CUIT 
  var es_cuit = false;
  var cuit = possible_string_date.split('-')
  if (cuit.length == 3) {
    if (cuit[0].length == 2 && cuit[2].length == 1) {
      es_cuit = true
    }
  }
  if (es_cuit) {
    return possible_string_date.trim()
  }

  // puede ser NUMEROS SEPARADOS , como en renovada_por y renovacion_de que haya espacios y guiones -.

  // ejemplo " - 3810353" , " - 3810353 - 3810353"
  // hay que separar por - y trimear para lego agregarlo como array
  var arr = possible_string_date.split('-')
  var nuevo_arr = []
  var no_son_numeros_separados = false;
  if (arr.length > 1) {
    arr.forEach(element => {
      var el = parseIntStrict(element.trim());
      if (!isNaN(el)) {
        nuevo_arr.push(el);
      } else {
        if (element != '') {
          no_son_numeros_separados = true
        } 
      }
    });
    if (!no_son_numeros_separados) {
      return `${nuevo_arr}`
    }
  }
  
  // puede ser FECHA
  
  var date_sin_hora = possible_string_date.split(" ")[0]
  var date = date_sin_hora.split("/")
  // test si es fecha (viendo si todos son numeros)
  if (date.length == 3) {
    var no_es_fecha = false;
    date.forEach(element => {
      var el = parseIntStrict(element.trim());
      if (isNaN(el)) {
        no_es_fecha = true;
      }
    });
    // si es fecha parseamos
    if (!no_es_fecha) {
      if (date.length == 3) {
        // es porque es fecha
        return `${date[2]}-${date[1]}-${date[0]}`
      }
    }
  }
  
  // puede ser un NUMERO
  var numero = parseIntStrict(possible_string_date.trim());
  if (!isNaN(numero)) {
    if (numero == 0) {
      return ""
    }
    return numero
  }

  // sino devolvemos el string original
  return possible_string_date
}

function getValueVariableJS(target, variable){
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
                    // uri: `https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=2835767`,
                    uri: `https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`,
                    // The global callback won't be called
                    callback: function (error, res, done) {
                        done();
                        reschedule();
                    }
                }]);
            }
            else {
                // c.queue(`https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=2835767`);
                c.queue(`https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${i}`);
            }
        }
    }
}




const insertInDB = (obj) => client.db("admin").collection("brands_nuevo").insertOne(obj).then(o => console.log(`${obj.acta} inserted in DB`)).catch(e => console.log(e))

const existsInDB = (id) => client.db("admin").collection("brands_nuevo").findOne({"acta":id}).then(it => it != null)

//const getMaxFromDB = () => client.db("test").collection("brands").find().sort({acta: -1}).limit(1).toArray().then(it => it[0].acta)
const getMaxFromDB = () => client.db("admin").collection("brands_nuevo").find().sort({acta: -1}).limit(1).toArray().then(it => it[0]?it[0].acta:2602480)

