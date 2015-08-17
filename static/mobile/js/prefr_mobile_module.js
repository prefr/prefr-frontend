"use strict";


angular.module(
    'prefrMobile',   
    [
        'ngDrawer'
    ]
)



.directive('prefrMobileRanking',[

    '$document',

    function($document){
        return {
            restrict: 'AE',

            link: function(scope, element, attrs){
                scope.unranked  = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
                scope.ranked    = []

                scope.$on('snap', function(event){
                    var option          = event.targetScope.option,
                        ranked_index    = scope.ranked.indexOf(option),
                        unranked_index  = scope.unranked.indexOf(option)

                    if(unranked_index != -1){
                        scope.unranked.splice(unranked_index, 1)
                        scope.ranked.push(option)
                    }

                    if(ranked_index != -1){
                        scope.ranked.splice(unranked_index, 1)
                        scope.unranked.push(option)
                    }                    

                })
            }

        }        
    }
])


