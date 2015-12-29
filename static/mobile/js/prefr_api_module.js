angular.module('prefrApi',[])

.provider('api', 

	function(){

		var api_url = '/api'


		this.setApiUrl =    function(url){
								api_url = url
							}


		this.$get      =    [
								'$http',

								function($http){

									var api 	=   function(method, path, data, config){
														config = config || {}
														config.method   = method
														config.url      = api_url+'/'+path.replace(/^\//,'')
														config.data     = data

														api.busyCalls++ 

														return $http(config)
																.finally(function(){
																	api.busyCalls--
																})
													}

									api.busyCalls = 0

									api.get 	=   function(path, data, config){ return api('GET', 	path, data, config) }
									api.post 	=   function(path, data, config){ return api('POST', 	path, data, config) }
									api.put 	=   function(path, data, config){ return api('PUT', 	path, data, config) }
									api.delete 	=   function(path, data, config){ return api('DELETE', 	path, data, config) }



									api.getBallot = function(box_id){
										return  api.get('/ballotBox/'+box_id)
												.then(function(result){
													return result.data
												})
									}

									api.getBallot = function(box_id){
										return  api.get('/ballotBox/'+box_id)
												.then(function(result){
													return result.data
												})
									}

									api.saveBallot = function(ballot){
										var data = ballot.exportData()

										return api.post('/ballotBox', data)
												.then(function(result){
													return result.data
												})                    
									}

									api.updateBallot = function(ballot, adminSecret){
										var data = ballot.exportData() 

										data.adminSecret = adminSecret              

										return  api.put('/ballotBox/'+data.id, data)
												.then(function(result){
													return result.data
												})
									}

									api.lockBallot= function(ballot, adminSecret){
										var data = ballot.exportData() 

										return  api.post('/ballotBox/'+data.id+'/lock',{
													'adminSecret' : adminSecret
												})
												.then(function(result){
													return result.data
												})
									}

									api.getResult = function(ballot){
										var data = ballot.exportData() 

										return  api.get('/ballotBox/'+data.id+'/result')
												.then(function(result){
													return result.data
												})
									}

									api.savePaper = function(ballot, paper, force_post){ //paper may just be diff data
										var data        =   paper.diff 
															?   paper.diff() || paper.exportData()
															:   paper,
											api_call    =   paper.id && !force_post
															?   api.put('/ballotBox/'+ballot.id+'/paper/'+paper.id, data)
															:   api.post('/ballotBox/'+ballot.id+'/paper', data)

										return  api_call
												.then(function(result){
													return result.data
												})
									}

									api.deletePaper = function(ballot, paper){
										return 	api.delete('/ballotBox/'+ballot.id+'/paper/'+paper.id)
												.then(function(result){
													return result.data
												})
									}

									

									return api
								}
							]
	}
)