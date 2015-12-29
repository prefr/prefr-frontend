"use strict";

(function() {

	angular.module('PrefrMobile',[
		'ngRoute',
		'ngTouch',
		'PrefrMobileRanking',
		'ngPrefrApi',
	])

	.config([
		'$routeProvider',
		'ngPrefrApiProvider',

		function($routeProvider, ngPrefrApiProvider){

			//apiProvider.setApiUrl('http://api.prefr.org/api')

			$routeProvider
			.when(
				'/:boxId?',
				{
					templateUrl :   'static/mobile/partials/pick.html',
					controller  :   'ballotBoxPick',
					reloadOnSearch: false
				}
			)
			.when(
				'/ballotBox/:boxId',
				{
					templateUrl :   'static/mobile/partials/pick.html',
					controller  :   'ballotBoxPick',
					reloadOnSearch: false
				}
			)
			.when(
				'/:boxId/edit/:paperId',
				{
					templateUrl :   'static/mobile/partials/ranking.html',
					controller  :   'ballotBoxEdit',
					reloadOnSearch: false
				}
			)
			.otherwise({
				redirectTo:     '/'
			})

			ngPrefrApiProvider
			.setApiUrl('/api')
		}
	])

	.service('ballotBox',[
		'$rootScope',
		'$q',
		'ngPrefrApi',

		function($rootScope, $q, ngPrefrApi){

			var self				= this,
				current_paper_id	= undefined

			$rootScope.log 			= []


			this.setById		= 	function(box_id){	

										if(!box_id){
											delete $rootScope.ballot
											return $q.reject(undefined)
										}

										if($rootScope.ballot && $rootScope.ballot.id == box_id){
											return $q.resolve($rootScope.ballot)
										}

										return 	ngPrefrApi.getBallot(box_id)
												.catch(function(reason){console.warn(reason)})
												.then(function(ballot){
													$rootScope.ballot = ballot	
													return $q.resolve(ballot)
												})
									}

			this.setPaperById	= 	function(paper_id){
										if(paper_id && !$rootScope.ballot)	return $q.reject('no ballot set')

										$rootScope.activePaper 	= 	$rootScope.ballot.papers.get(paper_id) 
										
										return $q.resolve($rootScope.activePaper)
									}

			this.savePaper 		=	function(){
										if(!$rootScope.ballot || !$rootScope.ballot.id) return $q.reject('no ballot to save paper to')

										return 	ngPrefrApi
												.updatePaper($rootScope.ballot.id, $rootScope.activePaper)
												.catch(function(reason){console.warn(reason)})
									} 

			this.newPaper		=	function(){
										if(!$rootScope.ballot || !$rootScope.ballot.id) return $q.reject('no ballot to add new paper to')

										return	ngPrefrApi
												.newPaper($rootScope.ballot.id)
												.catch(function(reason){console.warn(reason)})
												.then(function(paper){
													$rootScope.ballot.papers.push(paper)
													return paper													
												})
									}


			this.log			= 	function(text){
										$rootScope.log.unshift(text)
									}
		}
	])


	.controller('ballotBoxPick',[
		'$scope',
		'$routeParams',
		'$location',
		'$q',
		'ballotBox', 

		function($scope, $routeParams, $location, $q, ballotBox){
 
			var box_id 		= $routeParams.boxId

			$scope.activePaper 	= undefined
			$scope.unranked		= undefined

			//mock
			var ballot_data = 	{
									"id":			"BJ5MHcH0d6IzwMcTVbI2",
									"subject":		"What is the subject line?",
									"details":		"Thee are the subjects details.",
									"options":		[
														{"tag":"A","title":"LAN Party","details":""},
														{"tag":"B","title":"Blue","details":""},
														{"tag":"C","title":"Yesterday","details":""},
														{"tag":"D","title":"Cheesecake","details":""}
													],
									"papers":		[
														{
															"id":			"FsMOnWzVRCiU7lO8TwIy",
															"ranking":		[["B"],["A","C"],["D"]],
															"participant":	"Particpant 1",
															"created":		1448732809770
														},
														{
															"id":			"Va3p39pF7eiSarbP1ghP",
															"ranking":		[["A"],["C","D","B"]],
															"participant":	"Participant 2",
															"created":		1448732905677
														}
													],
									"createDate":	1448732806571
								}

			//mock:
			//$scope.ballot = ballot_data
			//
			ballotBox.setById(box_id)
			.then(function(ballot){
				$scope.$evalAsync()
			})
			.catch(function(){
				$scope.$evalAsync()
				
			})

			
			$scope.newPaper 	= 	function(){
										$q.resolve()
										.then(function(){
											return ballotBox.newPaper()
										})
										.then(function(paper){
											console.log(paper)
											return $scope.editPaper(paper)
										})
									}


			$scope.editPaper 	= 	function(paper){
										$location.path('/' + box_id + '/edit/' + paper.id)
									}

		}
	])


	.controller('ballotBoxEdit',[

		'$scope',
		'$routeParams',
		'$location',
		'$q',
		'ballotBox', 

		function($scope, $routeParams, $location, $q, ballotBox){
			var box_id 		= $routeParams.boxId,
				paper_id 	= $routeParams.paperId


			$scope.ready	= false


			$q.resolve()
			.then(function(){
				return ballotBox.setById(box_id)
			})
			.then(function(){
				return ballotBox.setPaperById(paper_id)
			})
			.then(function(paper){
				$scope.unranked 	= 	[
											$scope.ballot.options.filter(function(option){
												return 	paper.ranking.every(function(rank){
															return rank.indexOf(option.tag) == -1
														})
											})
											.map(function(option){
												return	option.tag
											})
										]
				return paper
			})
			.then(function(){
				$scope.$watch('activePaper.participant', function(participant){
					if(!participant) $scope.nameModal = true
				})
				$scope.ready = true				
			})

			$scope.pickPaper = function(){
				ballotBox.setPaperById(undefined)
				$location.path('/' + box_id)
			}

			$scope.setName = function(){
				$scope.nameModal = true
			}

			$scope.save = function(){

				var status_quo_rank = 	$scope.activePaper.ranking.filter(function(rank){
											return rank.indexOf("0") !=-1
										})[0]

				if($scope.unranked[0].length != 0 ){
					!!status_quo_rank
					?	[].push.apply(status_quo_rank, $scope.unranked[0])
					:	$scope.activePaper.ranking.push($scope.unranked[0])

					$scope.unranked = [[]]
				}


				$q.resolve()
				.then(function(){
					return ballotBox.savePaper()
				})
				.then(function(){
					ballotBox.log('saved: ' + $scope.activePaper.participant)
					$scope.pickPaper()
				})

			}

		}
	])

})()