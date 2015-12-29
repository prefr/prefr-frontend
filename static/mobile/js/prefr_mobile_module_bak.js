"use strict";

(function() {

	angular.module(
		'prefrMobile',   
		[
			'ng',
			'ngDrawer',
			'ngAnimate'
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

		'$animate',
		'$timeout',

		function($animate, $timeout){
			return {
				restrict: 	'E',
				scope: 		true,

				link: function(scope, element, attrs){
					scope.rankingA  = undefined
					scope.rankingB  = undefined



					//setup local ranking including empty ranks
					function initScope(){
						var model_a	= scope.$eval(attrs.rankingModelA),
							model_b	= scope.$eval(attrs.rankingModelB)


						function isArrayofArrays(x){
							return 		angular.isArray(x)
									&&	x.every(function(rank){ return angular.isArray(rank) })
						}	

						if(!isArrayofArrays(model_a))
							throw "Invalid ranking-model-a. Should be array of arrays. "						

						if(!isArrayofArrays(model_b))
							throw "Invalid ranking-model-b. Should be array of arrays. "

						scope.rankingA = attrs.ranksAFixed 	? 	[] 	: [[]]
						scope.rankingB = attrs.ranksBFixed 	?	[]	: [[]] 

						model_a.forEach(function(rank){
							scope.rankingA.push(rank)
							if(!attrs.ranksAFixed) scope.rankingA.push([])
						})

						model_b.forEach(function(rank){
							scope.rankingB.push(rank)
							if(!attrs.ranksBFixed) scope.rankingB.push([])
						})

					}



					initScope()

					scope.moveOption = function(container_from, container_to, option){

						var	value			= 	option.attr('value'),
							ranks_from		= 	container_from[0].id == 'ranked'
												?	scope.rankingA
												:	scope.rankingB,
							ranks_to		= 	container_from[0].id == 'ranked'
												?	scope.rankingB										
												:	scope.rankingA,
							fixed_from		=	container_from[0].id == 'ranked'
												?	!!attrs.ranksAFixed
												:	!!attrs.ranksBFixed,
							fixed_to		=	container_from[0].id == 'ranked'
												?	!!attrs.ranksBFixed
												:	!!attrs.ranksAFixed,
							dummy			=	container_to.find('prefr-v-space')

						if(dummy.length == 0) return null

						ranks_from.forEach(function(rank, rank_index){
							rank.forEach(function(tag, tag_index){
								if(value == tag){
									ranks_from[rank_index].splice(tag_index,1)
									if(	
											!fixed_from
										&&	ranks_from[rank_index].length == 0
									){
										ranks_from.splice(rank_index+1, 1)
										ranks_from.splice(rank_index-1, 1)
									}
								}
							})
						})


						var rank_index 		= 	container_to
												.find('prefr-mobile-rank')
												.index(dummy.parent()),
							tag_index		=	dummy
												.parent()
												.children()
												.index(dummy)

						container_to.scope().clearSpace(true)
						container_from.scope().clearSpace(true)

						ranks_to[rank_index].splice(tag_index,0, value)

						if(
								!fixed_to
							&&	ranks_to[rank_index].length == 1
						){	//just moved the first option in
							ranks_to.splice(rank_index+1, 0 , [])
							ranks_to.splice(rank_index, 0 , [])
						}

						scope.$digest()
					}		
				},

				controller: function(){

				}

			}

		}
	])



	.directive('prefrMobileRankingContainer',[

		'$animate',

		function($animate){
			return {
				restrict: 	'E',
				scope:		true,
				transclude:	true,
				require:	'^prefrMobileRanking',

				link: function(scope, element, attrs, ctrl, transclude){

					var type				=	attrs.prefrMobileContainer,
						c_container			=	element.siblings().eq(0),

						// scroll
						o_height			= 	element[0].offsetHeight,
						shuttle				=	angular.element('<div></div>'),
						scroll_block_top	=	angular.element('<div></div>'),
						scroll_block_bottom = 	angular.element('<div></div>'),

						//space:
						dummy   			=   angular.element('<prefr-v-space></prefer-v-space>')
												.css({
													'display':			'block',
													//'opacity':			'0',
													'height':			'0px'
												})
					 
					shuttle.css({
						'padding-top':		o_height+'px',
						'padding-bottom':	o_height+'px'
					})

					transclude(function(clone){
						shuttle.append(clone)
						element.append(shuttle)
					})


					scope.activate = function(){
						element.addClass('active')
					}

					scope.deactivate = function(){
						element.removeClass('active')
					}

					//Space:					
					scope.makeSpace = function(top, height){


						var closest_rank,
							closest_option,
							pos				= 	top + height/2,


							closest_rank	= 	element
												.find('prefr-mobile-rank')
												.toArray()
												.filter(function(rank, index, array){
													return		index == array.length-1
															||	(rank.offsetTop+rank.offsetHeight-element[0].scrollTop) > pos

												})[0]

							if(!closest_rank)
								console.warning('prefr-mobile-ranking, makeSpace: no ranks found.')

							closest_option  =	angular.element(closest_rank)
												.find('prefr-mobile-option')
												.toArray()
												.filter(function(option){
													return (option.offsetTop+option.offsetHeight-element[0].scrollTop) > pos
												})[0]



					
						if(closest_option){
							closest_option.offsetTop-element[0].scrollTop <= top							
							?	angular.element(closest_option).after(dummy)
							:	angular.element(closest_option).before(dummy)

						}else{
							angular.element(closest_rank)
							.append(dummy)

							element.addClass('emptyRankRequestingSpace')
						}

						dummy
						.css('transition-duration',		'')

						angular.element(closest_rank)
						.addClass('open')

						scope.virtualScrollBy((dummy[0].offsetTop-element[0].scrollTop)-top)

						dummy
						.css('height', '')
					}

					scope.clearSpace = function(keep_position){
						
						if(keep_position){
							scope.applyScroll()
							dummy
							.css('transition-duration',		'0ms')
						}else{
							scope.releaseVirtualScroll()
						}			


						dummy
						.css('height', '0px')
						
						dummy.parent()
						.removeClass('open')
						
						element
						.removeClass('emptyRankRequestingSpace')
					}
					

					scope.requestSpace = function(option){
						var top 			= option[0].offsetTop-option[0].offsetParent.scrollTop,
							height			= option[0].offsetHeight,
							last_scroll_top = element[0].scrollTop


						c_container.scope().makeSpace(top, height)
					}

					scope.releaseSpace = function(){
						c_container.scope().clearSpace()
					}

					scope.sendOption = function(option){
						scope.moveOption(element, c_container, option)
					}










					//scrolling:
					element[0].scrollTop = o_height



					//Todo: Auslagern!

					scope.virtualScrollBy = function(distance){
						var v_scroll 	= element.data('virtualScrollY') || 0,
							delta 		= v_scroll + distance

						shuttle
						.css({
							'transition-property':			'transform',
							'transition-duration':			'150ms',
							'transform': 					'translateY('+(-delta)+'px)'
						})

						element.data('virtualScrollY', delta)
					}

					scope.releaseVirtualScroll = function(){
						shuttle
						.css({
							'transform': 			''
						})

						element.data('virtualScrollY', 0)

					}

					scope.applyScroll = function(){
						shuttle
						.css({
							'transition-duration':	'0ms',
							'transform': 			''
						})

						element[0].scrollTop += element.data('virtualScrollY')||0
						element.data('virtualScrollY', 0)
					}


					$animate.on('enter', element, function(obj, phase){
						if(phase == 'start'){
							if(obj[0].tagName == 'PREFR-MOBILE-RANK')
								scope.virtualScrollBy(19.1) //Todo: hardcoded value =( 
						}

						if(phase == 'close'){
							if(obj[0].tagName == 'PREFR-MOBILE-RANK')
							 	scope.applyScroll()
						}

					})


					$animate.on('leave', element, function(obj, phase){
						if(phase == 'start'){
							if(obj[0].tagName == 'PREFR-MOBILE-RANK')
								scope.virtualScrollBy(-(Math.floor(obj[0].offsetHeight/2)+12.5)) //Todo: hardcoded value =(
						}
					})



					//workaround angular bug with animate leave close phase
					scope.$on('leave', function(event, obj, phase){ //todo replace
						// if(phase == 'start'){
						// 	if(obj[0].tagName == 'PREFR-MOBILE-RANK')
						// 		scope.virtualScrollBy(-(Math.floor(obj[0].offsetHeight/2))) //Todo: hardcoded value =(
						// }

						if(phase == 'close'){
							if(obj[0].tagName == 'PREFR-MOBILE-RANK')
							 	scope.applyScroll()
						}
					})
				},

				controller: function(){

				}
			}
		}
	])



	//Workaround angular animate leave phase bug

	.directive('prefrMobileRank',[
		'$rootScope',

		function($rootScope){
			return	{
				scope:	true,
				restrict: 'AE',
				link: function(scope, element, attrs){
					element.on('$destroy', function(){
						$rootScope.$broadcast('leave', element, 'close')
					})
				}
			}
		}
	])



	//Workaround angular animate leave phase bug

	.directive('prefrMobileOption',[
		'$rootScope',
		'$timeout',

		function($rootScope, $timeout){
			return	{
				scope:		true,
				restrict: 	'AE',
				require:	'^prefrMobileRankingContainer',				

				link: function(scope, element, attrs, rankingController){

					var parent_container 			= {},
						space_requested				= false,
						wait_for_it					= undefined

					parent_container.element 	= element.parentsUntil('prefr-mobile-ranking-container').parent().eq(0)
					parent_container.scope 	 	= parent_container.element.scope()


					function activateContainer(){
						parent_container.scope.activate()
					}

					function deactivateContainer(){
						parent_container.scope.deactivate()
					}

					function requestSpace(){
						if(!space_requested)
							parent_container.scope.requestSpace(element)

						space_requested = true
					}

					function releaseSpace(){
						if(space_requested)
							parent_container.scope.releaseSpace()

						space_requested = false
					}

					function sendOption(){
						parent_container.scope.sendOption(element)
					}


					element.on('touchstart', function(event){
						element.addClass('drawn')
						//wait_for_it = $timeout(requestSpace, 400)
					})

					function stopWaiting(){
						if(wait_for_it)
							$timeout.cancel(wait_for_it)

						wait_for_it = undefined
					} 

					element.on('ngDrawerStateChange', function(event, new_state, old_state){
						switch(new_state){
							case 	"prepared": activateContainer()
							break

							case	"drawn":	stopWaiting(); requestSpace(); 
							break

							case	"tucked":	stopWaiting(); releaseSpace(); deactivateContainer();
							break

							case 	"snapped":	stopWaiting(); sendOption(); deactivateContainer();
							break
						}
					})

					element.on('$destroy', function(){
						$rootScope.$broadcast('leave', element, 'close')
					})
				}
			}
		}
	])

}())


