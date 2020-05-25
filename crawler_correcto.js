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
    
    if (error) {
      console.log(error);
    } else {
      const $ = res.$;
      const obj = {}
      
      // let contador = 1; // hay 20 acordeones (secciones, inicia con 1)
      let limite = 20; // hay 20 acordeones (secciones, inicia con 1)
      
      // por si una marca no es valida
      if ($("h1").text() != "") {
        try {
          // numero de acta se saca de arriba de todo (no esta en tablas)
          obj["ACTA"] = $("h1").text().match(/\d+/g).map(Number)[0];
          
          // cada uno de estos será un objeto
          for (let index = 1; index <= limite; index++) {
            
            // obtenemos la propiedad padre
            let subtitulo = null;
            let titulo = $(`#accordion-${index} .panel-title a`).text();
            titulo = titulo.split(":");
            try {
              subtitulo = titulo[1].trim();
            } catch (e) {}
            titulo = titulo[0].trim()
            titulo = slugify(titulo.replace(":","").replace("\.",""), "_");
            obj[titulo] = {};
            
            // obtenemos el objeto de cada prop padre
            $(`#accordion-${index} .panel-body label.input`).each((i, elem) => {
              // para multiples titulares, creamos un titular y lo pusheamos al array .. TODO: no encuentro ejemplo
              // let titular = {}

              // if (titulo == 'TITULARIDAD') {

              // }

              // el subtitulo es si en el titulo tiene algo despues de un ':'
              if (subtitulo != null) {
                obj[titulo]['SUBTITULO'] = subtitulo
              }
              
              let text = $(elem).find("span").text().trim()
              let fieldName = elem.childNodes[0].nodeValue.trim()
              
              if (text == "") {
                text = fieldName.split(":")[1]
                fieldName = fieldName.split(":")[0]
              }
              
              fieldName = normalize(slugify(fieldName.replace(":","").replace("\.",""), "_"))
              
              if (fieldName.length > 0){
                let formatted_field = text.trim()
                try {
                  formatted_field = formatFromSpan(text.trim())
                } catch (e) {
                  console.log(e)
                  formatted_field = text.trim()
                }
                obj[titulo][fieldName] = formatted_field
              }
            })
            
            // **** DATOS SACADOS DE LA SECCION SCRIPTS ****
            
            let text = $($('script')).text();
            
            // **** OPOSICIONES TABLA DESDE VARIABLE JS ****
            
            let list_oposiciones = [];
            let var_ops = getValueVariableJS(text,"var opos = ");
            let oposiciones = eval(var_ops);
            oposiciones.forEach(oposicion => {
              let n_op = {};
              for (var prop in oposicion) {
                if (Object.prototype.hasOwnProperty.call(oposicion, prop)) {
                  let fieldName = normalize(prop.toUpperCase());
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
                  let fieldName = normalize(prop.toUpperCase());
                  try {
                    n_vis[fieldName] = getFormattedVals(vista[prop]);
                  } catch {
                    n_vis[fieldName] = vista[prop];
                  }
                }
              }
              list_vistas.push(n_vis);
            });
            obj["VISTAS_Y_NOTIFICACIONES"] = list_vistas;
            
            // **** TRANSFERENCIAS TABLA DESDE VARIABLE JS ****
            
            let lista_transferencias = [];
            var var_transf = getValueVariableJS(text, "var transferencias = ");
            var transferencias = eval(var_transf);
            transferencias.forEach(element => {
              let n_obj = {};
              for (var prop in element) {
                if (Object.prototype.hasOwnProperty.call(element, prop)) {
                  let fieldName = normalize(prop.toUpperCase());
                  try {
                    n_obj[fieldName] = getFormattedVals(element[prop]);
                  } catch {
                    n_obj[fieldName] = element[prop];
                  }
                }
              }
              lista_transferencias.push(n_obj);
            });
            obj["TRANSFERENCIA"] = lista_transferencias;
            
            // **** CAMBIOS DE RUBRO TABLA DESDE VARIABLE JS ****
            
            let lista_cambios_rubro = [];
            var var_cr = getValueVariableJS(text, "var CambioRubro = ");
            var cambios_rr = eval(var_cr);
            cambios_rr.forEach(element => {
              let n_obj = {};
              for (var prop in element) {
                if (Object.prototype.hasOwnProperty.call(element, prop)) {
                  let fieldName = normalize(prop.toUpperCase());
                  try {
                    n_obj[fieldName] = getFormattedVals(element[prop]);
                  } catch {
                    n_obj[fieldName] = element[prop];
                  }
                }
              }
              lista_cambios_rubro.push(n_obj);
            });
            obj["CAMBIO_DE_RUBRO"] = lista_cambios_rubro;
            
            // **** CADUCIDADES/NULIDADES TABLA DESDE VARIABLE JS ****
            
            let lista_caducidades = [];
            var var_ccnn = getValueVariableJS(text, "var Caducidades_Nulidades = ");
            var caducidades_nulidades = eval(var_ccnn);
            caducidades_nulidades.forEach(element => {
              let n_obj = {};
              for (var prop in element) {
                if (Object.prototype.hasOwnProperty.call(element, prop)) {
                  let fieldName = normalize(prop.toUpperCase());
                  try {
                    n_obj[fieldName] = getFormattedVals(element[prop]);
                  } catch {
                    n_obj[fieldName] = element[prop];
                  }
                }
              }
              lista_caducidades.push(n_obj);
            });
            obj["CADUCIDADES_NULIDADES"] = lista_caducidades;
            
            // **** DEMANDAS TABLA DESDE VARIABLE JS ****
            
            let lista_demandas = [];
            var var_dd = getValueVariableJS(text, "var Demandas = ");
            var demandas = eval(var_dd);
            demandas.forEach(element => {
              let n_obj = {};
              for (var prop in element) {
                if (Object.prototype.hasOwnProperty.call(element, prop)) {
                  let fieldName = normalize(prop.toUpperCase());
                  try {
                    n_obj[fieldName] = getFormattedVals(element[prop]);
                  } catch {
                    n_obj[fieldName] = element[prop];
                  }
                }
              }
              lista_demandas.push(n_obj);
            });
            obj["DEMANDAS"] = lista_demandas;
            
          }
          
          // almacenamos como array vacio a las props con objetos vacias (asi solo preguntamos por length en front)
          for(var pp in obj) {
            let empty = Object.keys(obj[pp]).length === 0 && obj[pp].constructor === Object
            if (empty) {
              // delete obj[pp]
              obj[pp] = []
            }
          }
          
          insertInDB(obj)
          
        } catch (e) {
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
    if (stringValue[0] != '-') {
      // puede ser negativo
      return NaN;
    }
    return parseInt(stringValue);
  }
}

// formateo de los datos del body html
function formatFromSpan(final_format) {
  
  // puede ser CUIT 
  var es_cuit = false;
  var cuit = final_format.split('-')
  if (cuit.length == 3) {
    if (cuit[0].length == 2 && cuit[2].length == 1) {
      es_cuit = true
    }
  }
  if (es_cuit) {
    return final_format.trim()
  }
  
  // puede ser NUMEROS SEPARADOS , como en renovada_por y renovacion_de que haya espacios y guiones -.
  
  // ejemplo " - 3810353" , " - 3810353 - 3810353"
  // hay que separar por - y trimear para lego agregarlo como array
  var arr = final_format.split('-')
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
  
  var date_sin_hora = final_format.split(" ")[0]
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
  var numero = parseIntStrict(final_format.trim());
  if (!isNaN(numero)) {
    if (numero == 0) {
      return ""
    }
    return numero
  }
  
  // sino devolvemos el string original
  return final_format
}

// formateo de las variables de la seccion SCRIPT...
function getValueVariableJS(target, variable){
  var recortar = target.substring(target.search(variable)+variable.length,target.length);
  var result = recortar.substring(0,recortar.search(";"));
  return result;
}

// formateo los datos de la seccion SCRIPT...
function getFormattedVals(final_format) {
  if (final_format != "" || final_format != undefined || final_format != null) {
    
    // me fijo si no es un numero primero
    var possible_number = parseIntStrict(final_format.slice(1,-1));
    if (!isNaN(possible_number)) { // si es un numero lo retorna
      return final_format
    }
    
    // date formato '/Date(nnnnnnnnnnnnn)/' (de los scripts)
    var date = final_format.slice(6, -2); // si puede hacer esto es o bien fecha (valida, invalida), o bien string
    date = parseIntStrict(date)
    // es string, puede ser fecha en formato string, o string cualquiera
    if (isNaN(date)) {

      // hubo un caso donde se almaceno fecha formato texto plano (como en body)
      // paso en el ejemplo que tiene demandas, entonces tengo que parsear a ver si es ese tipo de fecha

      var date_sin_hora = final_format.split(" ")[0]
      var date_tentativa = date_sin_hora.split("/")
      // test si es fecha (viendo si todos son numeros)

      if (date_tentativa.length == 3) {
        var no_es_fecha = false;
        date_tentativa.forEach(element => {
          var el = parseIntStrict(element.trim());
          if (isNaN(el)) {
            no_es_fecha = true;
          }
        });
        // si es fecha parseamos
        if (!no_es_fecha) {
          if (date_tentativa.length == 3) {
            // es porque es fecha
            return `${date_tentativa[2]}-${date_tentativa[1]}-${date_tentativa[0]}`
          }
        }
      }

      // sino retorno el string nomas
      return final_format.replace(/'/g, '"'); // ojo con esto, hay que ver si toma la BD y consultas y todo almacenar json con 'string "quote"'
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
  return final_format
}

// elimina las tildes y caracteres especiales
var normalize = (function() {
  var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç", 
      to   = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
      mapping = {};
 
  for(var i = 0, j = from.length; i < j; i++ )
      mapping[ from.charAt( i ) ] = to.charAt( i );
 
  return function( str ) {
      var ret = [];
      for( var i = 0, j = str.length; i < j; i++ ) {
          var c = str.charAt( i );
          if( mapping.hasOwnProperty( str.charAt( i ) ) )
              ret.push( mapping[ c ] );
          else
              ret.push( c );
      }      
      return ret.join( '' );
  }
})();

// function getAllElementsWithAttribute(attribute)
// {
//   var matchingElements = [];
//   var allElements = document.getElementsByTagName('*');
//   for (var i = 0, n = allElements.length; i < n; i++)
//   {
//     if (allElements[i].getAttribute(attribute) !== null)
//     {
//       // Element exists with attribute. Add to array.
//       matchingElements.push(allElements[i]);
//     }
//   }
//   return matchingElements;
// }

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

