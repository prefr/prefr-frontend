"use strict";

(function() {

	var array = []

	function arrayOf(list){
		return array.slice.call(list)
	}

	angular.module(
		'PrefrMobileRanking',   
		[
			'ng',
			'ngDrawer',
		]
	)

	.config([
		'ngDrawerProvider',

		function(ngDrawerProvider){

			ngDrawerProvider.config({
				overextend: 'inverse'
			})

			
		}
	])

	.directive('prefrMobileRanking',[

		'$timeout',

		function($timeout){
			return {
				restrict: 	'E',
				scope: 		true,

				link: function(scope, element, attrs){

					scope.heights = {
						empty_rank: undefined,
						rank: 		undefined,	//height without options or placeholders
						option:		undefined
					}
				},

				controller: function($scope, $element, $attrs){

					this.containers 	= 	[]

					this.rankingModel 	= 	{
												'A':	$scope.$eval($attrs.rankingModelA) || [[]],
												'B':	$scope.$eval($attrs.rankingModelB) || [[]]
											}
					this.ranksFixed		= 	{
												'A':	$scope.$eval($attrs.ranksAFixed) || false,
												'B':	$scope.$eval($attrs.ranksBFixed) || false
											}

					this.registerContainer = function(container, id){
						this.containers[id] = container
					}

					this.getSiblingContainer = function(id){
						switch(String(id).toUpperCase()){
							case "A" : return this.containers.B; break
							case "B" : return this.containers.A; break
						}
						return null
					}

					this.updateModel = function(id){

						var rankingModel = this.rankingModel[id]

						while(rankingModel.length){
							rankingModel.pop()
						}

						arrayOf(this.containers[id].find('prefr-mobile-rank'))
						.forEach(function(rank_element){
							var rank_obj 	= angular.element(rank_element),
								options		= rank_obj.find('prefr-mobile-option') 

							if(options.length == 0) return null

							rankingModel
							.push(
								arrayOf(options)
								.map(function(option_element){
									return option_element.getAttribute('value')
								})
							)

						})

						rankingModel.length == 0 && rankingModel.push([])

					}
				}

			}

		}
	])








	.directive('prefrMobileRankingContainer',[

		function(){
			return {
				restrict: 	'E',
				scope:		true,
				transclude:	true,
				require:	'^prefrMobileRanking',

				link: function(scope, element, attrs, rankingController, transclude){
					var id 					= attrs.rankingModel


					/* virtual scrolling start */
					var	virtual_scrolled	= 0,
						shuttle				= angular.element('<div class = "shuttle"></div>'),
						c_height			= element[0].clientHeight,
						scheduled_apply		= undefined

					shuttle
					.css({
						'padding-top':		c_height,
						'padding-bottom':	c_height
					})
					.appendTo(element)

					window.requestAnimationFrame(function(){
						element[0].scrollTop = shuttle[0].offsetHeight*0.5 -c_height *0.5  
					})


					scope.virtualScrollBy = function(distance){
						virtual_scrolled += distance
						shuttle.css({							
							'transition-duration':	'',
							'transform': 			'translateY('+(-virtual_scrolled)+'px)'
						})

						scheduled_apply && window.clearTimeout(scheduled_apply)
						scheduled_apply = window.setTimeout(function(){
							scope.applyVirtualScroll()
						},1000)
					}

					scope.releaseVirtualScroll = function(){
						shuttle.css('transform','')
						virtual_scrolled = 0
					}

					scope.virtualScrollElementToPos = function(el, top){
						scope.virtualScrollBy(el.getBoundingClientRect().top - top)
					}

					scope.applyVirtualScroll = function(){
						shuttle
						.css({
							'transition-duration':	'0ms',
							'transform': 			'translateY(0px)'
						})


						element[0].scrollTop += virtual_scrolled
						virtual_scrolled = 0
					}

					// shuttle.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(event){

					// })

					/* virtual scrolling end */






					/* rank controls start */

					var open_rank = undefined

					function getNewRank(rank){

						var new_rank_element 	= undefined,
							new_rank_scope 		= scope.$new() 

						new_rank_scope.rank = rank || []

						transclude(new_rank_scope, function(clone){
							new_rank_element = clone
						})

						if(new_rank_scope.rank.length == 0)
							new_rank_element.addClass('empty')

						return new_rank_element
					}

					function appendRank(rank){
						var new_rank_element = getNewRank(rank)
						shuttle.append(new_rank_element)
					}


					scope.populateRank = function(rank){
						rank.removeClass('empty')
						if(!scope.heights.empty_rank){
							var some_empty_rank = element.find('prefr-mobile-rank.empty:not(.open)')[0]
						 	scope.heights.empty_rank = (some_empty_rank && some_empty_rank.offsetHeight)
						}

						if(rankingController.ranksFixed[id]) return null




						var prev 	= getNewRank(),
							next	= getNewRank(),
							ranks	= prev.add(next)

						rank
						.before(prev)
						.after(next)
						.removeClass('empty')

						ranks
						.addClass('enter')
						.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(){
							angular.element(this).removeClass('enter')
						})

						
					}


					scope.clearRank = function(rank){
						if(rankingController.ranksFixed[id]) return null

						var prev	=	rank.prev(),
							next	=	rank.next(),
							ranks 	= 	prev.add(next)

						//scope.virtualScrollBy(-(prev[0].offsetHeight+next[0].offsetHeight)/2)

						ranks
						.addClass('leave')
						.on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(event){
							if(event.target == this) shuttle[0].removeChild(this)
						})

						rank.addClass('empty')
					}


					scope.openAt = function(top, height){
						//scope.close()
						var rank_elements			=	element[0].getElementsByTagName('prefr-mobile-rank'),
							closest_rank_element	= 	arrayOf(rank_elements)
														.filter(function(rank_element, index, array){
															return		index == array.length-1 
																	|| 	rank_element.getBoundingClientRect().bottom > top + height/2
														})[0],
							jq_closest_rank			=	angular.element(closest_rank_element)

						jq_closest_rank.scope().openAt(top, height)
						open_rank = jq_closest_rank
						element.addClass('open')

					}

					

					scope.close = function(){
						element.removeClass('open')
						open_rank && open_rank.scope().close()
						open_rank = undefined
					}

					/* rank controls end */



					/* ng-drawer interaction start */

					scope.activateContainer = function(){
						element.addClass('active')
					}

					scope.deactivateContainer = function(){
						element.removeClass('active')
					}

					function scrollAlong(){
						//Todo: check performance
						//Todo: ausgliedern:
						var initial_top 		= undefined,
							initial_scroll_top 	= element[0].scrollTop,
							distance			= 0,
							launched			= false

						element.on('touchmove', function(event){
							var top = event.originalEvent.touches[0].clientY

							initial_top = initial_top == undefined ? top : initial_top

							distance = top - initial_top
							
							if(Math.abs(distance) > 30) launched = true //Todo: hardcoded value :(


							window.requestAnimationFrame(function(){
								if(launched) element[0].scrollTop = initial_scroll_top + (initial_top-top)								
							})

						})	

					}

					function stopScrollingAlong(){
						//Toso, only off a specific function
						element.off('touchmove')
					}

					scope.requestSpaceAt = function(top, height){

						scrollAlong()					

						rankingController
						.getSiblingContainer(id)
							.scope()
								.openAt(top, height)

					}

					scope.releaseSpace = function(){

						stopScrollingAlong()

						rankingController
						.getSiblingContainer(id)
							.scope()
								.close()
					}

					/* ng-drawer interaction end */


					scope.transferOption = function(value){
						rankingController
						.getSiblingContainer(id)
							.scope()
								.receiveOption(value)
					}

					scope.receiveOption = function(value){
						element.find('prefr-option-placeholder')
						.parent()
							.scope()
								.insertOption(value)
					}



					scope.updateModel = function(){
						rankingController.updateModel(id)
					}










					function setup(){		
						!rankingController.ranksFixed[id] && appendRank()

						rankingController.rankingModel[id]
						.forEach(function(rank){
							appendRank(rank)
							!rankingController.ranksFixed[id] && appendRank()					
						})

						var some_empty_rank = element.find('prefr-mobile-rank.empty')[0]


						window.requestAnimationFrame(function(){
							some_empty_rank && (scope.heights.empty_rank = some_empty_rank.offsetHeight)
						})
					}








					rankingController.registerContainer(element, id)

					setup()

					element
					.on('webkitAnimationStart oanimationstart msAnimationStart animationstart', function(event){

						switch(event.target.tagName){
							case "PREFR-MOBILE-RANK":
								if(!scope.heights || !scope.heights.empty_rank) console.warn('empty_rank_height missing.')

								var enter 		= 	event.target.classList.contains('enter'),
									leave		=	event.target.classList.contains('leave'),
									delta		=	0
									
									if(enter) 	delta 	=  scope.heights.empty_rank/2
									if(leave)	delta	= -scope.heights.empty_rank/2 

								scope.virtualScrollBy(delta)
							break

							case "PREFR-OPTION-PLACEHOLDER":
								if(!scope.heights || !scope.heights.option) console.warn('option_height missing.')

								var enter 		= 	event.target.classList.contains('enter'),
									leave		=	event.target.classList.contains('leave'),
									delta		= 	0

									if(enter)	delta 	=  scope.heights.option/2 
									if(leave)	delta	= -scope.heights.option/2 


								scope.virtualScrollBy(delta)
							break
						}

					})
					.on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(event){
						switch(event.target.tagName){
							case "PREFR-MOBILE-RANK":
								//scope.applyVirtualScroll()
							break
						}
					})

				},

				controller: function(){

				}
			}
		}
	])














	.directive('prefrMobileRank',[

		function(){
			return	{
				scope:		true,
				restrict: 	'AE',
				transclude:	'true',				

				link: function(scope, element, attrs, rankingController, transclude){

					/* option controls start */
					
					if(scope.rank == undefined){
						console.warn('missing scope.rank on prefrMobileRank')
					}

					var options = []


					function getNewOption(value){

						var new_option_element 	= undefined,
							new_option_scope 	= scope.$new() 

						new_option_scope.value = value

						transclude(new_option_scope, function(clone){
							new_option_element = clone.filter('prefr-mobile-option')
						})

						return new_option_element
					}

					function appendOption(value){
						var new_option_element = getNewOption(value)

						element.append(new_option_element)
					}

					scope.insertOption = function(value){
						var new_option = getNewOption(value)

						element.find('prefr-option-placeholder')
						.replaceWith(new_option)


						if(element.find('prefr-mobile-option').length == 1) scope.populateRank(element)

						scope.$digest()
						scope.updateModel()
					}


					function removeOption(value){
						var placeholder = angular.element('<prefr-option-placeholder></prefr-option-placeholder>')
						element.find('prefr-mobile-option[value="'+value+'"]')
						.replaceWith(placeholder)

						placeholder
						.addClass('leave')
						.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(){
							element[0].removeChild(this)
						})
					}

					scope.dismissOption = function(value){
						scope.transferOption(value)
						if(element.find('prefr-mobile-option').length == 1){
							scope.clearRank(element)
							element.addClass('empty')
						}
						removeOption(value)
						scope.updateModel()						
					}


					scope.openAt = function(top, height){
						element.addClass('open')
						
						var option_elements			= 	element[0].getElementsByTagName('prefr-mobile-option'),
							closest_option_element	= 	arrayOf(option_elements)
														.filter(function(option_element, index, array){
															return option_element.getBoundingClientRect().top > top
														})[0],
							placeholder				=	angular.element('<prefr-option-placeholder></prefr-option-placeholder>')

						

						closest_option_element
						?	placeholder.insertBefore(closest_option_element)
						:	element.append(placeholder)

						scope.virtualScrollElementToPos(placeholder[0], top+height/2)
						placeholder.addClass('enter')
														
						return this
					}

					scope.close = function(){
						element.removeClass('open')
						element.find('prefr-option-placeholder')
							.on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(){
								element[0].removeChild(this)
							})
							.removeClass('open')
							.addClass('leave')
					}

					/* option controls end */


					

					/* interaction with ng-drawer start */
					/* interaction with ng-drawer end */


					function setup(){
						scope.rank.forEach(function(value){
							appendOption(value)
						})
					}

					setup()
				}
			}
		}
	])



	//Workaround angular animate leave phase bug

	.directive('prefrMobileOption',[
		'$timeout',

		function($timeout){
			return	{
				scope:		true,
				restrict: 	'E',

				link: function(scope, element, attrs){

					var wait_for_it		= undefined,
						space_requested	= false

					function requestSpace(){
						if(space_requested) return null

						var pos 	= element[0].getBoundingClientRect(),
							height	= pos.bottom-pos.top

						scope.heights.option = scope.heights.option || height

						window.requestAnimationFrame(function(){
							space_requested = true
							scope.requestSpaceAt(pos.top, height)
						})
					}

					function releaseSpace(){
						if(!space_requested) return null

						scope.releaseSpace()
						space_requested = false
					}

					function activateOption(){
						element.addClass('drawn')						
					}

					function deactivateOption(){
						var scope = element.scope()
						if(scope && scope.ngDrawerState == "tucked") 
							element.removeClass('drawn')
					}


					element.on('touchstart', function(event){
						activateOption()
						//wait_for_it = $timeout(requestSpace, 400)
					})

					element.on('touchend', function(){
						deactivateOption()						
					})

					function stopWaiting(){
						if(wait_for_it)
							$timeout.cancel(wait_for_it)

						wait_for_it = undefined
					}

					element.on('ngDrawerStateChange', function(event, new_state, old_state){
						switch(new_state){
							case 	"prepared": 
										scope.activateContainer()
							break

							case	"drawn":	
										stopWaiting(); 
										requestSpace(); 
							break

							case	"tucked":	
										stopWaiting(); 
										releaseSpace(); 
										scope.deactivateContainer();
										deactivateOption()
							break

							case 	"snapped":	
										stopWaiting(); 
										scope.dismissOption(scope.value); 
										releaseSpace(); 
										scope.deactivateContainer();
										deactivateOption()
							break
						}
					})
				}
			}
		}
	])

}())


