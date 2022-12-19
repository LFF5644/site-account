// CREATED: 13.12.2022 UM 15∶15;
// IMPORT //
const {
	ReadFile,
	WriteFile,
	CreateDir,
	tofsStr,
	random,
	decodeBase64,
	encodeBase64,
	xxhash,
	jsonStringify,
}=globals.functions;

//const {execSync}=require("child_process");

// FUNCTIONS //
this.start=()=>{// if service start execute this;
	this.accountIndex=[];
	this.accounts={};
	this.saveRequired=false;
	this.vars={};
	
	readAccountIndex:{
		const accountIndexFile="data/accounts/accountIndex.json";
		let accountIndex=ReadFile(accountIndexFile);
		if(accountIndex){
			try{this.accountIndex=JSON.parse(accountIndex)}
			catch(e){accountIndex=false;}
		}
		if(!accountIndex){
			WriteFile(accountIndexFile,"[]");
		}
	}
	loadAccountsFormFile:{
		let accountId="";
		for(accountId of this.accountIndex){
			const accountFolder="data/accounts/"+accountId;
			
			let thisAccount=ReadFile(accountFolder+"/account.json");
			if(thisAccount){
				try{thisAccount=JSON.parse(thisAccount);}
				catch(e){thisAccount=false}
			}
			if(!thisAccount){
				log("data incorrect, cant read accounts.json! deleting account "+accountId);
				//execSync("rm -rf "+accountFolder);
				continue;
			}

			let thisVars=ReadFile(accountFolder+"/vars.json");
			if(thisVars){
				try{thisVars=JSON.parse(thisVars);}
				catch(e){thisVars=false}
			}
			if(!thisVars){
				WriteFile(accountFolder+"/vars.json","{}");
				thisVars={};
			}

			thisAccount.vars=thisVars;
			const requiredInput=[
				"username",	// "LFF5644";
				"nickname",	// "Lando";
				"password",	// 345676543;
				"token",	// [{deviceName:"LFF-PC",token:346435,ip:"192.168.178.95"},{deviceName:"LFF-Handy",token:3245235,ip:"192.168.178.29"}];
			];
			if(requiredInput.some(item=>!thisAccount[item])){
				log("data incorrect! requiredInput not exist! deleting folder "+accountFolder);
				//execSync("rm -rf "+accountFolder);
				continue;
			}
			thisAccount.log=[];
			this.accounts[tofsStr(thisAccount.username)]=thisAccount;
		}
		this.reloadAccountIndex();
	}
	this.vars.saveInterval={
		execute:arg=>clearInterval(arg),
		arg:setInterval(this.save,1000*5,false),
	}
}
this.reloadAccountIndex=()=>{
	this.accountIndex=Object.keys(this.accounts);
	return true;
}
this.createAccount=input=>{
	const {
		username,
		nickname=null,
		password,
		ip,
		user_agent,
		mobil=false,
		bot=false,
		deviceName=null,
	}=input;
	const accountId=tofsStr(username);
	const thisToken={
		deviceName,
		token:random(),
		lastUse:Date.now(),
		created:Date.now(),
		lastIp:ip,
		user_agent,
		mobil,
		bot,
	};
	const account={
		username,
		nickname,
		password:xxhash(password),
		token:[thisToken],
		log:[],
		vars:{},
	};
	if(this.accountIndex.includes(accountId)){
		return{
			code:"acc exist",
			errormsg:"Der Benutzername ist bereitz vergeben!",
		};
	}
	this.accountIndex.push(accountId);
	this.accounts[accountId]=account;
	this.saveRequired=true;
	return{
		code:"ok",
		data:account,
	};
}
this.login=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){
		return result;
	}else{
		delete result.data;
		return result;
	}
}
this.authUserByInput=input=>{
	let {
		username,
		nickname,
		password,
		token,
	}=input;
	let accountId;

	if(token){
		token=decodeBase64(token).split("|");
		username=token[0];
		nickname=token[1];
		accountId=tofsStr(username);
		token=Number(token[2]);
	}else{
		accountId=tofsStr(username);
	}

	if(!this.accountIndex.includes(accountId)){
		return{
			code:"acc not found",
			allowed:false,
			errormsg:"Account konnte nicht gefunden werden!",
		};
	}
	const account=this.accounts[accountId];

	if(token){
		const tokenIndex=account.token.findIndex(item=>
			item.token===token
		);
		if(tokenIndex===-1){
			this.logPush({
				accountId,
				logMsg:(
					`user tryed to login with token but is is to stupid: ${input.deviceName?
						"Device Name: "+input.deviceName+", IP: "+input.ip:
						"IP: "+input.ip
					}${input.bot?", BOT":""}${input.mobil?", MOBIL":""}`
				),
			});
			return{
				code:"token err",
				allowed:false,
				errormsg:"Der angegebene Token ist abgelaufen oder nicht correct!",
			};
		}
		const tokenObject=account.token[tokenIndex];
		this.logPush({
			accountId,
			logMsg:(
				`login by token: ${tokenObject.deviceName?
					"Device Name: "+tokenObject.deviceName+", IP: "+input.ip:
					"IP: "+input.ip
				}${input.bot?", BOT":""}${input.mobil?", MOBIL":""}`
			),
		});
		/*
		tokenObject.lastUse=Date.now();
		tokenObject.lastIp=input.ip;
		tokenObject.bot=input.bot;
		tokenObject.mobil=input.mobil;
		tokenObject.user_agent=input.user_agent;
		*/
		return{
			code:"ok",
			allowed:true,
			data:{
				accountId,
				account,
				tokenIndex,
			},
		}
	}
	if(password){
		if(account.password==xxhash(password)){
			return{
				code:"ok",
				allowed:true,
				data:{
					accountId,
					account,
					tokenTemplate:this.tokenTemplate(input),
				},
			}
		}else{
			return{
				code:"wrong password",
				errormsg:"Falsches Password!",
				allowed:false,
			}
		}
	}
	return{
		code:"no data",
		allowed:false,
		errormsg:"Keine daten angegeben",
	}
}
this.logPush=data=>{
	let {account,accountId,logMsg}=data;
	if(accountId){
		if(!this.accountIndex.includes(accountId)){
			throw new Error("this account don't exist! ERROR ID 'we7fgh34zftvc'");
		}
		account=this.accounts[accountId];
	}
	if(account){
		accountId=tofsStr(account.username);
	}

	const date=new Date();
	const time=[
		`${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`,
		`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
	];
	this.accounts[accountId].log.push(`${time[0]} => ${time[1]}: ${logMsg}`);
	this.saveRequired=true;
}
this.tokenTemplate=input=>({
	deviceName:input.deviceName?input.deviceName:null,
	token:random(),
	lastUse:0,
	created:Date.now(),
	lastIp:input.ip,
	user_agent:input.user_agent?input.user_agent:"",
	mobil:input.mobil===true,
	bot:input.bot===true,
})
this.save=(must=false)=>{
	must=must===true;	// don't allow => this.save(Object);
	if(!must&&!this.saveRequired){return false;}
	log("SAVE!");
	this.reloadAccountIndex();
	WriteFile("data/accounts/accountIndex.json",jsonStringify(this.accountIndex));
	let accountId="";
	for(accountId of this.accountIndex){
		const account=this.accounts[accountId];
		const accountDir="data/accounts/"+accountId;

		const vars=account.vars;
		const log=account.log;
		delete account.vars;
		delete account.log;

		CreateDir(accountDir);
		WriteFile(accountDir+"/account.json",jsonStringify(account));
		WriteFile(accountDir+"/vars.json",jsonStringify(vars?vars:{}));

		const logFileData=ReadFile(accountDir+"/history.log");
		WriteFile(accountDir+"/history.log",
			(logFileData?logFileData:"")+
			(log?log:[]
					.map(item=>encodeBase64(item))
					.join("\n")+
					"\n"
			)
		);
		this.accounts[accountId].log=[];
	}
	this.saveRequired=false;
	return true;
}
this.stop=()=>{
	this.save(true);
	let varName;
	for(varName of Object.keys(this.vars)){
		const v=this.vars[varName];
		v.execute(v.arg);
	}
	this.vars={};
}
