// IMPORT //
const {ReadFile,WriteFile,tofsStr,random}=globals.functions;
const {execSync}=require("child_process");

// FUNCTIONS //
this.start=()=>{// if service start execute this;
	this.accountIndex=[];
	this.accounts={};
	this.saveRequired=false;
	
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
				log("data incorrect, cant read accounts.json! deleting folder "+accountFolder);
				execSync("rm -rf "+accountFolder);
				continue;
			}
			
			let thisVars=ReadFile(accountFolder+"/vars.json");
			if(thisVars){
				try{thisVars=JSON.parse(thisVars);}
				catch(e){thisVars=false}
			}
			if(!thisVars){
				WriteFile(accountFolder+"/vars.json","[]");
				thisVars={};
			}
			
			thisAccount.vars=thisVars;
			const requiredInput=[
				"username",	// "LFF5644";
				"nickname",	// "Lando";
				"password",	// 345676543;
			//	"token",	// [{deviceName:"LFF-PC",token:346435,ip:"192.168.178.95"},{deviceName:"LFF-Handy",token:3245235,ip:"192.168.178.29"}];
			];
			if(requiredInput.some(item=>!thisAccount[item])){
				log("data incorrect! requiredInput not exist! deleting folder "+accountFolder);
				execSync("rm -rf "+accountFolder);
				continue;
			}

			this.accounts[tofsStr(thisAccount.username)]=thisAccount;

		}
	}
}
this.GenToken=()=>{return random()}

this.reloadAccountIndex=()=>{
	this.accountIndex=Object.keys(this.accounts)
		.filter(item=>
			this.accounts[item]?
				tofsStr(this.accounts[item].username):
				false
	);
	return true;
}
this.createAccount=(data)=>{
	const {username,nickname,password}=data;
	const userId=tofsStr(username);
	this.accountIndex.push(userId);
	this.accounts[userId]={
		username,
		nickname,
		password,
	};
}
this.save=(must=false)=>{
	must=must===true;	// don't allow => this.save(Object);
	if(!must&&!this.saveRequired){return false;}
	this.accountIndex=Object.keys(this.accounts)
		.filter(item=>
			this.accounts[item]?
				tofsStr(this.accounts[item].username):
				false
	);
	let accountId="";
	for(accountId of this.accountIndex){
		const account=this.accounts[accountId];
		const accountJSON=JSON.stringify(account,null,2).split("  ").join("\t");
		WriteFile("data/accounts/"+accountId+"/account.json",accountJSON);
	}
}
this.stop=()=>{
	save(true);
}
