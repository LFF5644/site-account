// CREATED: 13.12.2022 UM 15∶15;
// IMPORT //
const {
	ReadFile,
	ReadJsonFile,
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
	this.ranks={};
	this.vars={};
	
	readRanksFromFile:{
		const fileRanks="config/account_ranks.json";
		let fileData=ReadJsonFile(fileRanks);
		if(!fileData){
			fileData={default:[]};
			log("ranks file cant found or load correctly!");
		}
		this.ranks=fileData;
	}

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
			if(requiredInput.some(item=>thisAccount[item]===undefined)){
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
		arg:setInterval(this.save,1000*20,false),
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
	if(!username||!password){return{
		code:"no data",
		errormsg:"es fehlen wichtige Information zum neuen account!",
	}}
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
		rankNames:["default"],
		rankAttrs:[],
	};
	if(this.accountIndex.includes(accountId)){
		return{
			code:"acc exist",
			errormsg:"Der Benutzername ist bereits vergeben!",
		};
	}
	this.accountIndex.push(accountId);
	this.accounts[accountId]=account;
	this.saveRequired=true;
	return{
		code:"ok",
		data:{
			tokenHash:thisToken.token,
			tokenRaw:account.username+"|"+account.nickname+"|"+thisToken.token,
			token:encodeBase64(account.username+"|"+account.nickname+"|"+thisToken.token),
		},
	}
}
this.login=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){
		return result;
	}
	return{code:"ok"};
}
this.authUserByInput=input=>{// AUTH USER BY INPUT;
	let {
		username,
		nickname,
		password,
		token,
	}=input;
	let accountId;

	if(token){
		try{
			token=decodeBase64(unescape(token)).split("|");
			username=token[0];
			nickname=token[1];
			accountId=tofsStr(username);
			if(token.length!==3){throw "err";}
			token=Number(token[2]);
		}catch(e){return{
			code:"token format err",
			allowed:false,
			errormsg:"Das Token Format ist veraltet oder nicht erlaubt!",
		}}
		
	}else if(username){
		accountId=tofsStr(username);
	}else{
		return{
			code:"no data",
			allowed:false,
			errormsg:"Keine Daten angegeben",
		}
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
					`user tried to login with wrong token: ${input.deviceName?
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
		this.updateTokenInfos({
			accountId,
			tokenIndex,
			input,
		});
		return{
			code:"ok",
			allowed:true,
			loginBy:"token",
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
				loginBy:"password",
				data:{
					accountId,
					account,
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
		errormsg:"Keine Daten angegeben",
	}
}
this.logPush=data=>{
	let {account,accountId,logMsg}=data;
	if(accountId){
		if(!this.accountIndex.includes(accountId)){
			log("account cant found WRONG ID "+accountId);
			return false;
		}
		account=this.accounts[accountId];
	}
	if(account){
		accountId=tofsStr(account.username);
	}

	const date=new Date();
	const time=[
		`${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()}`,
		`${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`,
	];
	this.accounts[accountId].log.push(`${time[0]} => ${time[1]}: ${logMsg}`);
	this.saveRequired=true;
	return true;
}
this.tokenTemplate=input=>({
	deviceName: input.deviceName?input.deviceName:null,
	token: random(),
	lastUse: 0,
	created: Date.now(),
	lastIp: input.ip,
	user_agent: input.user_agent?input.user_agent:"",
	mobil: input.mobil===true,
	bot: input.bot===true,
})
this.updateTokenInfos=data=>{
	let {
		accountId,
		account,
		tokenIndex,
		input,
	}=data;
	if(!accountId&&!account){
		log("this.updateTokenInfos() {data} has not {account} or {accountId}");
		return false;
	}
	if(accountId){
		account=this.accounts[accountId];
	}else{
		accountId=tofsStr(account.username);
	}

	const tokenObject=account.token[tokenIndex];

	tokenObject.lastUse=Date.now();
	tokenObject.lastIp=input.ip;
	tokenObject.bot=input.bot;
	tokenObject.mobil=input.mobil;
	tokenObject.user_agent=input.user_agent;

	let item;
	for(item of Object.keys(tokenObject)){
		this.accounts[accountId].token[tokenIndex][item]=tokenObject[item];
	}
	this.saveRequired=true;
	return true;
}
this.setVarByInput=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){
		return result;
	}
	const {varname,vardata}=input;
	const accountId=result.data.accountId;

	if(!varname||!vardata){
		return{
			code:"data undefined",
			errormsg:"Variablen Informationen sind nicht definiert",
		};
	}

	if(!this.accounts[accountId].vars[varname]){
		const now=Date.now();
		this.accounts[accountId].vars[varname]={
			lastUse:now,
			lastWrite:now,
			lastRead:now,
			data:vardata,
		}
	}else{
		const now=Date.now();
		this.accounts[accountId].vars[varname]={
			...this.accounts[accountId].vars[varname],
			lastUse:now,
			lastWrite:now,
			data:vardata,
		}
	}
	this.saveRequired=true;

	return {code:"ok"};
}
this.getVarByInput=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){
		return result;
	}
	const accountId=result.data.accountId;

	if(!input.varname){
		return{
			code:"data undefined",
			errormsg:"Variablenname ist nicht definiert!",
		};
	}

	const vardata=this.accounts[accountId].vars[input.varname];
	if(vardata){
		const now=Date.now();
		this.accounts[accountId].vars[input.varname]={
			...vardata,
			lastRead:now,
			lastUse:now,
		};
	}

	if(!vardata){return{
		code:"var not exist",
		errormsg:"Variable nicht gefunden",
	}}
	else{return{
		code:"ok",
		data:{
			varname:input.varname,
			vardata,
		},
	}}
}
this.createTokenByInput=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){return result;}
	const {accountId,account}=result.data;
	const loginBy=result.loginBy;

	if(loginBy=="token"){
		return{
			code:"already token exist",
			errormsg:"Du hast bereits einen Anmeldeschlüssel (Token) auf diesem gerät!",
		}
	}
	const newToken=this.tokenTemplate(input);
	this.accounts[accountId].token.push(newToken);
	return{
		code:"ok",
		data:{
			tokenHash:newToken.token,
			tokenRaw:account.username+"|"+account.nickname+"|"+newToken.token,
			token:encodeBase64(account.username+"|"+account.nickname+"|"+newToken.token),
		},
	}
}
this.logoutDevice=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){return result;}
	const {accountId,account}=result.data;
	const {tokenCreated}=input;

	const tokenIndex=account.token.findIndex(token=>
		token.created==tokenCreated
	);
	if(tokenIndex===undefined){return{
		code:"token not found",
		errormsg:"Das Gerät konnte nicht gefunden werden!",
	}}
	this.accounts[accountId].token.splice(tokenIndex,1);
	this.saveRequired=true;
	return{code:"ok"}
}
this.getRanks=()=>{
	return {
		code:"ok",
		data:{
			ranks:this.ranks,
		},
	};
}
this.getRanksByInput=input=>{
	const result=this.authUserByInput(input);
	if(!result.allowed){return result}

	const accountId=result.data.accountId;
	
	if(
		!this.accounts[accountId].rankNames||
		!this.accounts[accountId].rankAttrs
	){
		this.accounts[accountId].rankNames=["default"];
		this.accounts[accountId].rankAttrs=[];
		
	}

	return{
		code:"ok",
		data:{
			rankNames:this.accounts[accountId].rankNames,
			rankAttrs:this.accounts[accountId].rankAttrs,
			ranks:this.ranks,
		},
	}

}
this.hasAccountRankAttr=data=>{
	const {
		username,
		rankAttr,
	}=data;
	if(!rankAttr||!username){return false}

	const accountId=tofsStr(username);
	const account=this.accounts[accountId];
	
	if(account.rankAttrs.includes(rankAttr)){return true}
	
	let item;
	for(item of account.rankNames){
		const ranks=this.ranks[item];
		if(ranks.includes(rankAttr)){return true}
	}
	return false;
}
this.save=(must=false)=>{
	must=must===true;	// don't allow => this.save(Object);
	if(!must&&!this.saveRequired){return false;}
	//log("SAVE!");
	this.reloadAccountIndex();
	WriteFile("data/accounts/accountIndex.json",jsonStringify(this.accountIndex));
	let accountId="";
	for(accountId of this.accountIndex){
		const account=this.accounts[accountId];
		const accountDir="data/accounts/"+accountId;

		const vars=account.vars;
		const log=account.log;

		account.vars=undefined;
		account.log=undefined;
		
		CreateDir(accountDir);
		WriteFile(accountDir+"/account.json",jsonStringify(account));
		WriteFile(accountDir+"/vars.json",jsonStringify(vars?vars:{}));

		const logFileData=ReadFile(accountDir+"/history.log");
		WriteFile(accountDir+"/history.log",
			(logFileData?logFileData:"")+
			((log?log:[])
				.map(item=>encodeBase64(item))
				.join("\n")
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

}
