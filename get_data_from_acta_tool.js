// updatea en la BD el registro que matchee con el acta que se ingresa por parametro

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb://strapi:strapi@localhost:27017/admin?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true, reconnectTries: Number.MAX_VALUE, reconnectInterval: 1000 });

const Crawler = require("crawler");
const slugify = require('slugify');
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())

server = app.listen(80, () => console.log(`Listening on ${80}`))

// app.get('/', (req,res) => {res.send("Hola")})

client.connect(async(err) => {
  console.log('Connectado a BD')
});


const c = new Crawler({
  maxConnections : 10,
  rateLimit: 500,
  callback : async function (error, res, done) {
    console.log(`Ejecutando...`);
    const obj = {}
    
    if (error) {
      console.log(error);
    } else {
      const $ = res.$;
      
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

          // en caso de tener multiples titulares lo cargaremos en la estructura TITULARIDAD_MULTIPLE
          let tits = $(`#accordion-2 .panel-body .reg-input`).children()
          let alltits = [];
          let tit = {}
          tits.each((i, elem) => {

            let separador = $(elem).find("hr")
            
            if (separador.length == 1) {
              alltits.push(tit)
              tit = {}
            }
            
            let fieldName = $(elem).find(".input").text().trim()

            text = fieldName.split(":")[1]
            fieldName = fieldName.split(":")[0]

            fieldName = normalize(slugify(fieldName.replace(":","").replace("\.",""), "_"))

            if (fieldName.length > 0){
              let formatted_field = text.trim()
              try {
                formatted_field = formatFromSpan(text.trim())
              } catch (e) {
                console.log(e)
                formatted_field = text.trim()
              }
              tit[fieldName] = formatted_field
            }
          })
          
          obj['TITULARIDAD_MULTIPLE'] = alltits;
          
          // almacenamos como array vacio a las props con objetos vacias (asi solo preguntamos por length en front)
          for(var pp in obj) {
            let empty = Object.keys(obj[pp]).length === 0 && obj[pp].constructor === Object
            if (empty) {
              // delete obj[pp]
              obj[pp] = []
            }
          }
          
          // return obj;
          updateInDB(res.options.acta_nro, obj)
          
        } catch (e) {
          console.log(`Error: ${e}`);
        }
      }
    }
    
    done();
  }
});


app.get('/', (req, res) => {
  let acta_numero = req.query.acta;
  let response = {
    success: false,
    data: 'Numero de Acta no encontrado en INPI'
  }
  if (acta_numero) {
    let data = c.queue({
      uri:`https://portaltramites.inpi.gob.ar/MarcasConsultas/Resultado?acta=${acta_numero}`, 
      acta_nro: acta_numero
    });
    response = {
      success: true,
      data: 'Actualizando el Acta en la BD'
    }
  }
  res.json(response);
})

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
      return final_format
      // return final_format.replace(/'/g, '"'); // ojo con esto, hay que ver si toma la BD y consultas y todo almacenar json con 'string "quote"'
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

// const insertInDB = (obj) => client.db("admin").collection("INPIBRANDS").insertOne(obj).then(o => console.log(`${obj.ACTA} inserted in DB`)).catch(e => console.log(e))
const updateInDB = (acta, obj) => {
  console.log(obj)
  client.db("admin").collection("INPIBRANDS").updateOne({"ACTA": parseInt(acta)}, { $set: obj }, {upsert: true}).then(o => console.log(`${obj.ACTA} updated in DB`)).catch(e => console.log(e))
}

