this.start=()=>{
	this.accountIndex=[];
	this.accounts=[];
	this.saveRequired=false;
	const {ReadFile,WriteFile}=globals.functions;
	
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
		const accountPath="data/accounts/[accountId]"
		const accountJSON="/account.json"
		let accountId="";
		for(accountId of this.accountIndex){
			ReadFile(``)
		}
	}

}
this.GenToken=()=>{return(globals.functions.random())}

/*this.GetAccount=(accName,accTP,type="token")=>{
	const {GetLine,ReadFile,decodeBase64}=globals.functions;
	const accounts=fs.readdirSync('data/accounts');
	let acc;
	let result=["error","WRONG!"];
	for(acc of accounts){
		let accJSON=ReadFile("data/accounts/"+acc+"/account.json");
		try{accJSON=JSON.parse(accJSON);}
		catch(e){throw new Error(`data/accounts/${acc}/account.json <= FILE IS BROKEN! FILE CANT parse!`)}

				
	}
	return(result)
}*/
this.reloadAccountIndex=()=>{

}
this.createAccount=(username,password)=>{}

this.stop=()=>{}
