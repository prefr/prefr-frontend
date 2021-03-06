"use strict";

angular.module('prefrControllers', [])

.controller(
	'HeaderCtrl',
	[
		'$scope',
		'Storage',
		'api',
		
		function($scope, Storage, api){
			$scope.Storage 	= Storage
			$scope.api 		= api

			$scope.removeItem = function(id){
				delete Storage[id]
			}
		}
	]
)





.controller(
	'NewBallotBoxCtrl',
	[
		'$scope',
		'$location',
		'$window',
		'Storage',
		'Ballot',
		'BallotOption',
		'api',

		function($scope, $location, $window, Storage, Ballot, BallotOption, api){


			$scope.setup = function(){				
				$scope.ballot 			=	$scope.ballot
											||
											new Ballot({
												id: 		undefined,
												subject: 	undefined,
												options:	[
																{
																	tag:		"A",
																	title:		"",
																	details: 	"",
																}
															],
												papers:		[]

											})

				$scope.status_quo 		= 	$scope.status_quo 
											|| new BallotOption({									
												tag:		"0",
												title:		"Status Quo / do nothing.",
												details: 	"This options represents the status quo. Anything ranked above this option is considered acceptable. Everything ranked lower than this option is considered rejected.",
											})

				$scope.steps			=	["Introduction", "Subject matter", "Options", "Special option: Status Quo (optional)", "How to participate"]
			}

			$scope.clear = function(){
				delete $scope.ballot
				delete $scope.status_quo
				delete $scope.use_status_quo
			}


			$scope.next = function(){
				$location.search('step', parseInt($location.search().step || 0)+1)
				$window.scrollTo(0,0)
			}

			$scope.previous = function(){				
				$window.history.back()				
				$window.scrollTo(0,0)
			}

			$scope.gotoBallot = function(){				
				$location.path($scope.adminPath)
			}

			$scope.saveBallot = function(use_status_quo){

				if($scope.saving)
					return null

				if(use_status_quo)
					$scope.ballot.options.push($scope.status_quo)

				var url = $location.absUrl()

				$scope.saving = true
				

				return 	api.saveBallot($scope.ballot)
						.then(function(data){							

							$scope.participantPath 	= '/ballotBox/'+data.id
							$scope.adminPath		= '/ballotBox/'+data.id+'/'+data.adminSecret

							$scope.participantLink	= url.replace(/\/ballotBox\/new.*$/, $scope.participantPath)
							$scope.adminLink		= url.replace(/\/ballotBox\/new.*$/, $scope.adminPath)


							Storage[data.id] = Storage[data.id] || {}

							angular.extend(Storage[data.id], {
						   		id:				data.id,
						   		subject:		data.subject,
						   		link:			$scope.adminLink
							})


							$scope.next()
						})
						.finally(function(){
							delete $scope.saving
						})
			}	

			$scope.update = function(){
				if(!$scope.ballot)
					$location.search('step',null)

				if($location.search().step == undefined)
					$scope.clear()

				$scope.step = parseInt($location.search().step) || 0
				$scope.setup()	
			}


			$scope.$on('$locationChangeStart', function(){
				$scope.update()
			})

			$scope.$on('$destroy', function(){
				$location.search('step', null)
			})

			$scope.update()
		}
	]
) 




.controller(

	'BallotBoxCtrl', 
	[
		'$config',
		'$scope', 
		'$routeParams',
		'$location',
		'$interval',
		'$q',
		'$window',
		'$timeout',
		'Storage',
		'Ballot',
		'BallotPaper',
		'api',

		function ($config, $scope, $routeParams, $location, $interval, $q, $window, $timeout, Storage, Ballot, BallotPaper, api){

							
			$scope.adminSecret 		= $routeParams.admin_secret
			$scope.box_id			= $routeParams.box_id
			$scope.isAdmin 			= !!$scope.adminSecret
			$scope.adminLink 		= $location.absUrl().replace(/\?.*$/,'')
			$scope.participantLink	= $scope.adminLink.replace('/'+$scope.adminSecret, '')

			$scope.removeBallotPaper = function(paper_id) {
		        if($scope.ballot_box.papers[paper_id]) delete $scope.ballot_box.papers[paper_id]
		    }

		    $scope.getSchulzeRanking = function() {
		        api.getResult($scope.ballot)
		        .then(function(data){
		        	$scope.result =	new BallotPaper({
						        		participant: 'Result',
						        		ranking: data.result
						        	})
		        	$scope.result.lock()
		        })
		    } 

		    $scope.lockBallotBox = function(){
		    	api.lockBallot($scope.ballot, $scope.adminSecret)		    	
		        .then(function(data){
		        	$scope.ballot.importData(data)
		        	if($scope.ballot.locked)
						$scope.getSchulzeRanking()
					$scope.lockPapers()
		        })
		    }

		    $scope.savePaper = function(paper){
    			if(paper.scheduledSave)
	    			$timeout.cancel(paper.scheduledSave)


	    		
				paper.scheduledSave	=	$timeout(function(){
											var diff = paper.diff()

									    	if(!diff || paper.removed) return $q.reject()

					    					return 	api.savePaper($scope.ballot, paper)  			
						   				}, 1000)
						   									

	    		return	paper.scheduledSave
						.then(function(data){
							paper.importData(data)
						})
		    }

		    $scope.removePaper = function(paper){
		    	$scope.ballot.removePaper(paper)
		    	return 	paper.id
    					?	api.deletePaper($scope.ballot, paper)	    	
    					:	$q.when()
		    }

		    $scope.restorePaper = function(paper){
		    	$scope.ballot.restorePaper(paper)

		    	return	paper.id
		    			?	api.savePaper($scope.ballot, paper, true)
			    			.then(function(result){
			    				paper.importData(result.data)
			    			})
			    		:	$q.when()
		    }

		    $scope.updateBallotBox = function(){	    	
		    	return 	api.updateBallot($scope.ballot, $scope.adminSecret)
                        .then(function(data){
                            $scope.ballot
                            .importSettings(data)
                			.importOptions(data.options || [])

                            $scope.correctPapers()

                            if($scope.ballot.locked)
                                $scope.getSchulzeRanking()

                         	Storage[data.id] = Storage[data.id] || {}

							angular.extend(Storage[data.id], {
						   		id:			data.id,
						   		subject:	data.subject						   		
							})
                        })
		    }

		    $scope.checkForRemoteUpdates = function(){
		    	return 	api.getBallot($scope.ballot.id)
		    			.then(function(data){

		    				//Dont overwrite Ballot if changes have been made
		    				if(!$scope.ballot.diff())
			    				$scope.ballot
			    				.importSettings(data)
			    				.importOptions(data.options)

			    			$scope.ballot
			    			.importPapers(data.papers)
		    			})
		    }

		    $scope.lockPapers = function() {
		    	$scope.ballot.papers.forEach(function(paper){ 
		    			!Storage[$scope.ballot.id]
		    		||	!Storage[$scope.ballot.id].unlocked 
		    		|| Storage[$scope.ballot.id].unlocked.indexOf(paper.id) == -1
		    		?	paper.lock()
		    		:	paper.unlock()
		    	})

		    	$scope.ballot.papers.sort(function(p1, p2){
		    		return p1.locked
		    	})


		    }

		    $scope.getUnrankedOptions = function(paper){
		    	var ranked_options 		= paper.getRankedOptions(),
		    		available_options 	= $scope.ballot.options.map(function(option){ return option.tag })

		    	return available_options.filter(function(tag){ return ranked_options.indexOf(tag) == -1 })
		    }

		    $scope.getSurplusOptions = function(paper){
		    	var ranked_options 		= paper.getRankedOptions(),
		    		available_options 	= $scope.ballot.options.map(function(option){ return option.tag })

		    	return ranked_options.filter(function(tag){ return available_options.indexOf(tag) == -1 })
		    }

		    $scope.correctPapers = function(){
		    	$scope.ballot.papers.forEach(function(paper){
                	var unranked_options 	= $scope.getUnrankedOptions(paper),
                		surplus_options		= $scope.getSurplusOptions(paper)


                	unranked_options.forEach(function(tag){
                		paper.addOption(tag)
                	})

                	surplus_options.forEach(function(tag){
                		paper.removeOption(tag)
                	})

                })
		    }

		    $scope.setupBallotBox = function(data){
				$scope.ballot	= new Ballot(data)

				var url 		= $location.absUrl().replace(/\?.*$/, '')


				Storage[data.id] = Storage[data.id] || {}

				angular.extend(Storage[data.id], {
			   		id:			data.id,
			   		subject:	data.subject,
			   		link:		url
				})

				$scope.lockPapers()
		
				if(data.result){
					$scope.result	=	new BallotPaper({
							        		participant: 'Result',
							        		ranking: data.result
							        	})
				}


				if($scope.ballot.papers.length == 0 && !$scope.ballot.locked) {
					$scope.ballot.newPaper().unlock()							
				}


				//watch for paper changes:
				$scope.$watch('ballot.papers', function(){


					$scope.correctPapers()

					$scope.ballot.papers.forEach(function(paper){
						if(!paper.removed)
							$scope.savePaper(paper)
					})					


					angular.extend(Storage[data.id], {
				   		id:				data.id,
				   		subject:		data.subject,
				   		link:			url,
				   		unlocked:		$scope.ballot.papers
				   						.filter(function(paper){ return !paper.locked})
				   						.map(function(paper){ return paper.id })
					})

				}, true)

				//regulary check for remote changes to the ballot:
				var remoteCheck = null

				function startCheckingRemote(){
					if(!remoteCheck){
						$scope.checkForRemoteUpdates()
						remoteCheck = $interval($scope.checkForRemoteUpdates, $config.checkRemoteInterval*1000)
					}
				}

				function stopCheckingRemote(){
					if(!!remoteCheck){
						$interval.cancel(remoteCheck)
						remoteCheck = null
					}
				}

				angular.element($window).on('focus',	startCheckingRemote)
				angular.element($window).on('blur', 	stopCheckingRemote)

				$scope.$on('$destroy', function(){
					stopCheckingRemote()
					angular.element($window).off('focus', 	startCheckingRemote)
					angular.element($window).off('blur', 	stopCheckingRemote)
				})

				startCheckingRemote()

		    }


			api.getBallot($scope.box_id)
			.then($scope.setupBallotBox)
		}
	]
)
