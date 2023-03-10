require('dotenv').config()
const express = require('express')
const handlebars = require('express-handlebars')
const bodyParser = require('body-parser')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
require(path.join(__dirname+'/frontend/model/usuario.js'))
const Usuario = mongoose.model("users")
const session = require('express-session')
const passport = require('passport')
require("./config/auth")(passport)

app.set("view engine", "ejs");

// função do passport para autenticar
function ehAutenticado(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect("/")
}
    //Sessão
        app.use(session({
            secret: "SDHSJDAKSDHJD",
            resave: true,
            saveUninitialized: true
        }))
        app.use(passport.initialize())
        app.use(passport.session())

        app.use((req,res,next) => {
            res.locals.user = req.user || null
            next()
        })

        app.use(bodyParser.urlencoded({extended: true}))
        app.use(bodyParser.json())
        app.use(express.static(path.join(__dirname + '/public')))

//Rotas
    app.get('/', (req,res) => {
        res.sendFile(path.join(__dirname+'/frontend/view/index.html'))
    })

    app.get('/inicio', ehAutenticado, function(req, res){
        const User1 = {
            id: req.user._id,
            nome: req.user.nome,
            email: req.user.email,
            viagens: req.user.viagens
        } 
        console.log(req.user)
        res.render("inicio", {usuarioLogado: User1})
    })
    
    app.get('/login', function(req, res){
        res.sendFile(path.join(__dirname+'/frontend/view/login.html'))
    })

    app.get('/register', function(req, res){
        res.sendFile(path.join(__dirname+'/frontend/view/register.html'))
    })

    app.post('/usuarios/cadastrar', function(req, res){
        var erros = []

        if(!req.body.user || typeof req.body.user == undefined || req.body.user == null){
            erros.push({texto: "Nome inválido"})
        }

        if(!req.body.mail || typeof req.body.mail == undefined || req.body.mail == null){
            erros.push({texto: "Email inválido"})
        }

        if(!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null){
            erros.push({texto: "Senha inválida"})
        }

        if(req.body.senha != req.body.confirmsenha){
            erros.push({texto: "As senhas não conferem"})
        }

        if(req.body.senha.length < 4){
            erros.push({texto: "Senha muito curta"})
        }

        if(erros.length > 0){
            console.log(erros)

        } else {
            Usuario.findOne({email: req.body.mail}).then((usuario) => {
                if(usuario){
                    console.log("Já existe um usuário cadastrado com esse email")
                    res.redirect("/register")
                } else {
                    const novoUsuario = new Usuario({
                        nome: req.body.user,
                        email: req.body.mail,
                        senha: req.body.senha 
                    }).save().then(() => {
                        console.log("Usúario salvo com sucesso")
                    }).catch((err) => {
                        res.status(422).json({ message: 'OCORREU UM ERORORRO!' })
                        console.log("Ocorreu um erro ao salvar o usúario"+err)
                    })
                    console.log("Usuário logado com sucesso")
                    res.redirect("/login")
                }
            }).catch((err) => {
                console.log("Houve um erro ao cadastrar")
                res.redirect("/register") 
            })
        }
    })


    app.post('/usuarios/compartilhar', async (req, res) =>{
        
        const id = req.user._id // id do usuario atual
        const mail_userAtual = req.user.email // email do usuario atual
        const mail = req.body.usuarioCompartilhado // email do usuario a ser compartilhada a viagem
        const obj_viagem = JSON.parse(req.body.selectViagens)  // recuperando e transformando p/ object a viagem 
        const local_viagem = obj_viagem["local"] // pegando o local da viagem, que é a chave primaria
        const pessoas = obj_viagem["pessoas"].push(mail) // adicionando o email do usuario a ser compartilhado na viagem
        const pessoas_total = obj_viagem["pessoas"].push(mail_userAtual) // adicionando o email do usuario na viagem
        const lista_pessoas = []
        lista_pessoas.push(mail, mail_userAtual)
        const viagem = {$push: {viagens: obj_viagem}}

        try {
            
            const updatedPerson = await Usuario.updateOne({ _id: id, "viagens.local": local_viagem }, { $push: { "viagens.$.pessoas" : mail } })
            const updatedPersonAmigo = await Usuario.updateOne({ email: mail }, viagem)
            if ((updatedPersonAmigo.matchedCount === 0) || (updatedPerson.matchedCount === 0)) {
              res.status(422).json({ message: 'Usuário não encontrado!' })
              return
            }
        
            res.redirect("/inicio")
          } catch (error) {
            res.status(500).json({ erro: error })
          }
    })

    app.post('/usuarios/atualizar', async (req, res) =>{

        const id = req.user._id

        const dados_novos = {
            nome: req.body.user_name,
            email: req.body.user_mail,
        }

        try {
            const updatedPerson = await Usuario.updateOne({ _id: id }, dados_novos)
        
            if (updatedPerson.matchedCount === 0) {
              res.status(422).json({ message: 'Usuário não encontrado!' })
              return
            }
        
            console.log("Usuário atualizado com sucesso")
            res.redirect("/inicio")
          } catch (error) {
            res.status(500).json({ erro: error })
          }
    })

    
    app.post('/usuarios/viagens', async (req, res) =>{

        const id = req.user._id

        const v1 = req.body.viagem1
        const v2 = req.body.viagem2
        const v3 = req.body.viagem3
        var dict = new Map()
        if (v1 != undefined) {
            dict.set("local", "Urubici")
            dict.set("data_ida", "05/10/2023")
            dict.set("data_volta", "09/10/2023")
            dict.set("guia_turistico", false)
            dict.set("hospedagem", true)
            dict.set("cafe_da_manha", true)
            dict.set("pessoas", [req.user.email])
        }

        else if (v2 != undefined) {
            dict.set("local", "Cascata do Avencal")
            dict.set("data_ida", "07/04/2023")
            dict.set("data_volta", "12/04/2023")
            dict.set("guia_turistico", true)
            dict.set("hospedagem", true)
            dict.set("cafe_da_manha", false)
            dict.set("pessoas", [req.user.email])
        }

        else {
            dict.set("local", "Serra do Rio do Rastro")
            dict.set("data_ida", "20/09/2023")
            dict.set("data_volta", "24/09/2023")
            dict.set("guia_turistico", true)
            dict.set("hospedagem", true)
            dict.set("cafe_da_manha", true)
            dict.set("pessoas", [req.user.email])
        }
        

        const query = {
            $push: {viagens: dict}
        }

        try {
            const updatedPerson = await Usuario.updateOne({ _id: id }, query)
        
            if (updatedPerson.matchedCount === 0) {
              res.status(422).json({ message: 'Usuário não encontrado!' })
              return
            }
        
            console.log("Viagem adicionada")
            res.redirect("/inicio")
          } catch (error) {
            res.status(500).json({ erro: error })
          }
    })


    app.post('/usuarios/logar', function(req, res, next){
        passport.authenticate("local", {
            successRedirect: "/inicio",
            failureRedirect: "/login"
        })(req, res, next)
    })

//MongoDB 
    const dbUser = process.env.DB_USER
    const dbPassword = process.env.DB_PASS
    mongoose.Promise = global.Promise
    mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.2vlgiyx.mongodb.net/?retryWrites=true&w=majority`, {
        useNewUrlParser: true
    }).then(() => {
        console.log("MongoDB Conectado!")
    }).catch((err) => {
        console.log("Houve um erro ao se conectar ao mongoDB"+err)
    })

const PORT = 3000
app.listen(PORT, function(){
    console.log("Servidor rodando!")
}) 
