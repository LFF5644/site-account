this.GetAccount=(accName,accTP,type="token")=>{
	let accounts=fs.readdirSync('data/accounts');
	let acc;
	let result=["error","WRONG!"];
	for(acc of accounts){
		let fileText_accINI=globals.functions.ReadFile("data/accounts/"+acc+"/acc.ini");
		let fileText_serverOnlyINI=globals.functions.ReadFile("data/accounts/"+acc+"/serverOnly.ini");
		if(globals.functions.GetLine(fileText_accINI,"username")[1]===accName){
			if(type==="password"&&globals.functions.decodeBase64(globals.functions.GetLine(fileText_accINI,"password")[1].split("[IQUIL]").join("=").split("[BR]").join("\n"))==accTP){
				result=["data","data/accounts/"+acc];
			}else if(type==="token"&&globals.functions.GetLine(fileText_serverOnlyINI,"token")[1]===accTP){
				result=["data","data/accounts/"+acc];
			}
		}
	}
	return(result)
}
this.GenToken=()=>{return(globals.functions.random())}

this.start=()=>{}

this.stop=()=>{}