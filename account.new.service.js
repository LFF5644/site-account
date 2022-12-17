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
this.createAccount=data=>{
	const {
		username,
		nickname=null,
		password,
		ip,
		user_agent,
		mobil=false,
		bot=false,
		deviceName=null,
	}=data;
	const userId=tofsStr(username);
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
	};
	if(this.accountIndex.includes(userId)){
		return {
			code:"acc exist",
			errormsg:"Der Benutzername ist bereitz vergeben!",
		};
	}
	this.accountIndex.push(userId);
	this.accounts[userId]=account;
	this.saveRequired=true;
	return {
		code:"ok",
		data:account,
	};
}
this.login=(loginData)=>{
	let {
		username,
		nickname,
		token,
	}=loginData;
	let userId;

	if(token){
		token=decodeBase64(token).split("|");
		username=token[0];
		nickname=token[1];
		userId=tofsStr(username);
		token=Number(token[2]);
	}else{
		userId=tofsStr(username);
	}

	if(!this.accountIndex.includes(userId)){
		return {
			code:"acc not found",
			errormsg:"Account konnte nicht gefunden Werden!",
		};
	}
	const account=this.accounts[userId];
	return {
		code:"ok",
		data:account,
	};
}
this.save=(must=false)=>{
	must=must===true;	// don't allow => this.save(Object);
	if(!must&&!this.saveRequired){return false;}
	log("SAVE!");
	this.reloadAccountIndex();
	WriteFile("data/accounts/accountIndex.json",jsonStringify(this.accountIndex));
	let accountId="";
	for(accountId of this.accountIndex){
		const account=this.accounts[accountId];
		const vars=account.vars;
		delete account.vars;
		CreateDir("data/accounts/"+accountId);
		WriteFile("data/accounts/"+accountId+"/account.json",jsonStringify(account));
		WriteFile("data/accounts/"+accountId+"/vars.json",jsonStringify(vars));
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
