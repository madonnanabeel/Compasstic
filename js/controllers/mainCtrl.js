angular.module('compasstic.controllers').controller('mainCtrl',
    ['$scope', '$window', '$webServicesFactory',
        function ($scope, $window, $webServicesFactory) {
            $scope.find = function(search){
                console.info(compassticSentiWord[search]);
            };
            $scope.commentsLimit = 400;
            $scope.overallSentiment = {
                posCount:0,
                negCount: 0,
                total: $scope.commentsLimit
            };
            $scope.comments = [];

            $scope.firebaseCommentsURL = "https://compasstic-c2156.firebaseio.com/comments.json";
            $scope.firebaseOpinionsURL = "https://compasstic-c2156.firebaseio.com/opinions.json";


            $scope.getChar=function () {

                var c =[];
                for(var i = 65;i <=90;i++){
                    for(var y=65;y<=90;y++){
                        c.push(String.fromCharCode(i)+String.fromCharCode(y));
                    }

                }
                console.log(c);
            };
            function convertToNumberingScheme(number) {

                var baseChar = ("a").charCodeAt(0),letters  = "";

                do {
                    number -= 1;
                    letters = String.fromCharCode(baseChar + (number % 26)) + letters;
                    number = (number / 26) >> 0;

                } while(number > 0);

                return letters;
            }

            for (var i =1;i<800;i++)
                console.log(convertToNumberingScheme(i));

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

            $webServicesFactory.get("https://graph.facebook.com/oauth/access_token", {},
                {
                    client_id:"1835491116686888",
                    client_secret: "b46eb511f1dbe0d54afc6c93f3056dda",
                    grant_type:"client_credentials"
                }
            ).then(
                function (response) {
                    $scope.access_token = response.split('=');
                    console.info("Got access token");
                }
            );

            var commentsAfter = "";


            $scope.getPagesFromFB = function () {
                $scope.FBPages = {};
                $scope.numberOfPages = 0;
                $scope.letters = "abcdefghijklmnopqrstuvwxyz";
                $scope.letterIndex = 0;
                function pagesOfLetter(url) {
                    $webServicesFactory.get(url, {}, {
                        access_token: $scope.access_token
                    }).then(
                        function (response) {
                            for(var i=0; i<response.data.length; i+=1){
                                if(!$scope.FBPages[response.data[i].id])
                                    $scope.numberOfPages += 1;
                                $scope.FBPages[response.data[i].id] = response.data[i].name;
                            }

                            if(response.paging.next)
                                pagesOfLetter(response.paging.next);
                            else{
                                console.info("Done "+$scope.letters[$scope.letterIndex]);
                                if($scope.letterIndex == $scope.letters.length-1){
                                    console.info("Got "+$scope.numberOfPages+" unique page.");
                                    $scope.catagorizeFBPages($scope.FBPages);
                                }
                                else{
                                    $scope.letterIndex += 1;
                                    pagesOfLetter("https://graph.facebook.com/search?q="+$scope.letters[$scope.letterIndex]+"&type=page&limit=400");
                                }
                            }
                        }
                    );
                }

                pagesOfLetter("https://graph.facebook.com/search?q="+$scope.letters[$scope.letterIndex]+"&type=page&limit=400");

            };
            $scope.catagorizeFBPages = function (pages) {
                $scope.FBPages = {};
                var cat = "";
                var count = $scope.numberOfPages;
                for(var id in pages){
                    $webServicesFactory.get("https://graph.facebook.com/"+id+"?fields=category", {}, {
                        access_token: $scope.access_token
                    }).then(
                        function (response) {
                            cat = response.category.replace(/ /g,"_").replace(/\//g, "&" );
                            if(!$scope.FBPages[cat])
                                $scope.FBPages[cat] = {};

                            $scope.FBPages[cat][response.id] = pages[response.id];
                            count--;
                            if(count == 0){
                                console.info($scope.FBPages);
                                $webServicesFactory.patch(
                                    "https://compasstic-c2156.firebaseio.com/pages.json",
                                    {},
                                    $scope.FBPages
                                ).then(
                                    function (response) {
                                        console.info(response);
                                    }
                                );
                            }
                        }
                    );
                }
            };
            $scope.getComments = function () {
                console.info("Getting comments.");
                //daily news, T vs H 7976226799_10154668352051800
                //T and nuc 228735667216_10154233142332217
                // 7976226799_10155066114886800
                //https://www.facebook.com/thedailyshow/videos/10155066114886800/
                $scope.urlID = "7976226799_10155066114886800";
                $scope.getPagesFromFB();

                        /*$webServicesFactory.get("https://graph.facebook.com/63811549237?fields=category", {}, {
                            access_token: response.split('=')[1]
                        }).then(
                            function (response) {
                                console.info(response);
                            }
                        );*/


                /*FB.api("/page", {
                    fields: ''
                }, function (response) {
                    console.log(response);
                });*/

                /*FB.api("/"+$scope.urlID, {
                    fields: 'comments.limit(' + $scope.commentsLimit + ')'+ commentsAfter
                }, function (response) {

                    response =  response.comments;
                    $scope.comments= $scope.comments.concat(response.data);
                    $scope.$apply();

                    if (response.paging.next) {
                        commentsAfter = '.after('+response.paging.cursors.after+')';
                        $scope.getComments();
                    }
                    else{
                        console.info("Got " + $scope.comments.length + " comment");
                        //console.log($scope.comments);
                        $scope.buildPostBOW($scope.comments);
                        //$scope.pushCommentsToDB($scope.urlID, $scope.comments);
                    }

                });*/

            };


            $scope.setFeeling=function (value,index) {
                $scope.comments[index].sentiment = value.toString();
                //console.info('changed to ' +value.toString()+'index = '+index);

            };
            $scope.printComment = function (index) {
                console.info('Comment : ' + $scope.comments[index].message + ' Class : ' + $scope.comments[index].sentiment);
            };
            /////////////////////////////////////////////////
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
            ////////////////////////////////////////////////
            ////////////Classing////////////////////////////
            //builds Bag Of Words for this post
            $scope.buildPostBOW = function (comments) {
                console.info("Setting BOW.");
                var BOW = {};
                var commentTxt = "";
                for(var commentI=0; commentI<comments.length; commentI+=1){
                    commentTxt = comments[commentI].message.toLowerCase().replace(/[^\w]/gi, ' ').replace(/_/g, ' ').replace(/\r?\n|\r/g, ' ').replace(/ +(?= )/g,'').split(' ');
                    for(var wordI=0; wordI<commentTxt.length; wordI+=1){
                        if(!BOW[commentTxt[wordI]])
                            BOW[commentTxt[wordI]]=0;

                        BOW[commentTxt[wordI]] += 1;
                    }
                }
                console.info(BOW);

            };
            $scope.startClassing = function () {
                $scope.comments = [];

                $webServicesFactory.get(
                    $scope.firebaseCommentsURL,
                    {},
                    {orderBy: '"$key"', limitToFirst: 10}
                ).then(
                    function (response) {
                        for(r in response){
                            response[r].id = r;
                            $scope.comments.push(response[r]);
                        }
                    }
                );

            };
            $scope.postOpinion = function (index) {
                var data = {};
                var message = $scope.comments[index].message.toLowerCase();

                data[$scope.comments[index].id] ={
                    a:[],
                    v:[],
                    n:[],
                    r:[]
                };
                var messageArr = $scope.comments[index].message.toLowerCase().split(' ');
                for(word in messageArr)
                    if(compassticSentiWordPOS[messageArr[word]]){
                        if(!data[$scope.comments[index].id][compassticSentiWordPOS[messageArr[word]][0].pos].contains(messageArr[word]))
                        data[$scope.comments[index].id][compassticSentiWordPOS[messageArr[word]][0].pos].push(messageArr[word]);
                    }

                    console.info(data);


                data[$scope.comments[index].id].sentiment = $scope.comments[index].sentiment;

                $webServicesFactory.patch(
                    $scope.firebaseOpinionsURL,
                    {},
                    data
                ).then(
                    function (response) {
                        console.info(response);


                        $webServicesFactory.delete(
                            "https://compasstic-c2156.firebaseio.com/comments/"+$scope.comments[index].id+".json"
                        ).then(
                            function (response) {
                                console.info(response);
                                $scope.comments.splice(index, 1);

                            }
                        );

                    }
                );
            };


            $scope.pushCommentsToDB = function (id, comments) {
                var data={};
                //data[id] = comments;
                for(var i=0; i<comments.length; i+=1){
                    data[id+"_"+i] = comments[i];
                }
                console.info(data);
                $webServicesFactory.patch(
                    $scope.firebaseCommentsURL,
                    {},
                    data
                ).then(
                    function (response) {
                        console.info(response);
                    }
                );

            };
        }
    ]
);
