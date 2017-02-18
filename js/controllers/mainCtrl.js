angular.module('compasstic.controllers').controller('mainCtrl',
    ['$scope', '$window',
        function ($scope, $window) {
            $scope.find = function(search){
                console.info(compassticSentiWord[search]);
            };
            $scope.commentsLimit = 200;
            $scope.overallSentiment = {
                posCount:0,
                negCount: 0,
                total: $scope.commentsLimit
            };
            $scope.comments = [];

            $window.fbAsyncInit = function() {
                FB.init({
                    appId: '1835491116686888',
                    status: true,
                    cookie: true,
                    xfbml: true,
                    version: 'v2.3'
                });
                console.log("Inited FB.");

                FB.login(function(){
                    console.log("Logged in FB.");
                }, {scope: 'publish_actions'});

            };

            $scope.getComments = function () {
                //daily news, T vs H 7976226799_10154668352051800
                //T and nuc 228735667216_10154233142332217
                FB.api('/7976226799_10154668352051800', {
                    fields: 'comments.limit('+$scope.commentsLimit+')'
                }, function(response) {
                    $scope.comments = response.comments.data;
                    $scope.$apply();
                    console.info("Got "+$scope.comments.length+" comment");
                });
            };
            $scope.setFeeling=function (value,index) {
                $scope.comments[index].sentiment = value.toString();
                console.info('changed to ' +value.toString()+'index = '+index);

            }

            $scope.printComment = function (index) {
                console.info('Comment : ' + $scope.comments[index].message + ' Class : ' + $scope.comments[index].sentiment);
            }
            $scope.setQuery = function (query) {
                query = query.toLowerCase();

                var tempComments = [];
                var str = "";
                for(var i=0; i<$scope.comments.length; i+=1){

                    str = $scope.comments[i].message.toLowerCase().replace(/[^a-z ]/g, "");

                    if(str.split(' ').indexOf(query) != -1)
                        tempComments.push($scope.comments[i])
                }

                $scope.comments = tempComments;
                $scope.query = "";
                console.info('Filtered by "'+query+'", result: '+$scope.comments.length+' comment');
            };

            $scope.getSentiment = function () {
                $scope.overallSentiment = {
                    posCount:0,
                    negCount: 0,
                    total: $scope.commentsLimit
                };

                var words = [];
                for(var comment=0; comment<$scope.comments.length; comment+=1){
                    words = $scope.comments[comment].message.toLowerCase().replace(/[^a-z ]/g, "").split(' ');

                    $scope.comments[comment].pos = 0;
                    $scope.comments[comment].neg = 0;
                    for(var word=0; word<words.length; word+=1){
                        $scope.comments[comment].pos += ((compassticSentiWord[words[word]])? compassticSentiWord[words[word]].avgPos:0);
                        $scope.comments[comment].neg += ((compassticSentiWord[words[word]])? compassticSentiWord[words[word]].avgNeg:0);
                    }

                    $scope.comments[comment].pos = $scope.comments[comment].pos.toFixed(3);
                    $scope.comments[comment].neg = $scope.comments[comment].neg.toFixed(3);


                    if($scope.comments[comment].pos>$scope.comments[comment].neg){
                        $scope.comments[comment].sentiment = 'positive';
                        $scope.overallSentiment.posCount += 1;
                    }
                    else{
                        $scope.comments[comment].sentiment = 'negative';
                        $scope.overallSentiment.negCount += 1;
                    }


                }//end of for

                $scope.overallSentiment.positive = (($scope.overallSentiment.posCount/$scope.comments.length)*100).toFixed(2);
                $scope.overallSentiment.negative = (($scope.overallSentiment.negCount/$scope.comments.length)*100).toFixed(2);

                console.info("Got sentiment:");
                console.info($scope.overallSentiment);
            };


        }
    ]
);
