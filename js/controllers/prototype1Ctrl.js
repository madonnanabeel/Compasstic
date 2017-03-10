angular.module('compasstic.controllers').controller('prototype1Ctrl',
    ['$scope', '$pagesProvider', '$appDataProvider', '$stopWordsProvider', '$q', '$window', '$webServicesFactory',
        function ($scope, $pagesProvider, $appDataProvider, $stopWordsProvider, $q, $window, $webServicesFactory) {
            $scope.pages = $pagesProvider;
            $scope.selectedPage = "_";
            $scope.selectedTopic = "";
            $scope.statue = "ready";
            $scope.preSample = {};
            $scope.sample = {};
            $scope.BOWReady = false;
            $scope.readyToClass = false;

            $scope.commentsLimit = 400;
            
            function getFBToken() {
                $webServicesFactory.get("https://graph.facebook.com/oauth/access_token", {},
                    {
                        client_id: $appDataProvider.FB.ID,
                        client_secret: $appDataProvider.FB.secret,
                        grant_type: $appDataProvider.FB.grantTypes
                    }
                ).then(
                    function (response) {
                        $scope.accessToken = response.split('=');
                        console.info("Got access token.");
                    }
                );
            }
            getFBToken();

            $scope.setPreSample = function () {
                $webServicesFactory.get("https://compasstic-c2156.firebaseio.com/opinions.json", {}, {}).then(
                    function (response) {
                        //console.info(response)
                        $scope.preSample = response;
                    }
                );
            };
            $scope.setPreSample();


            $scope.getSentiment = function () {
                $scope.comments = [];
                var commentsAfter = "";
                var _postsCount = 0;
                //gets latest 100 post from selected page
                function getPosts() {
                    $scope.statue ="Getting most recent 100 post from "+$scope.pages[$scope.selectedPage].name;
                    var deferrd = $q.defer();
                    $webServicesFactory.get("https://graph.facebook.com/"+$scope.selectedPage+"/posts", {}, {
                        access_token: $scope.accessToken,
                        limit: 100
                    }).then(
                        function (response) {
                            console.info("Got "+response.data.length+" post.");
                            $scope.posts = response.data;
                            deferrd.resolve();
                        }
                    );

                    return deferrd.promise;
                }
                //filters posts based on selected topic
                function filterPosts() {
                    $scope.statue = 'Filtering posts by "'+$scope.selectedTopic+'"';
                    var posts = $scope.posts;
                    $scope.posts = {};

                    for(var i=0; i<posts.length; i+=1){
                        if(posts[i].message && posts[i].message.toLowerCase().indexOf($scope.selectedTopic.toLowerCase())!== -1)
                            $scope.posts[posts[i].id] = posts[i];
                    }

                    console.info("Found "+Object.keys($scope.posts).length+" posts about "+$scope.selectedTopic+".");
                }
                //builds the bag of words
                function buildBOW() {
                    $scope.statue = "Building BOW.";
                    var BOW = {};
                    var commentTxt = "";
                    //filling bow from comments
                    for(var c=0; c<$scope.comments.length; c+=1){
                        if(!$scope.comments[c].message)
                            continue;

                        commentTxt = $scope.cleanText($scope.comments[c].message).split(' ');
                        for(var w=0; w<commentTxt.length; w+=1){
                            //if not a stop word
                            if(!$stopWordsProvider[commentTxt[w]]) {
                                if (!BOW[commentTxt[w]])
                                    BOW[commentTxt[w]] = 0;

                                BOW[commentTxt[w]] += 1;
                            }
                        }
                        $scope.statue = "Building BOW. " + Math.round((c+1)/$scope.comments.length *100)+ "%";
                    }
                    console.info("Found "+Object.keys(BOW).length+" unique word.");
                    delete BOW[""];

                    console.info("Found "+Object.keys(BOW).length+" unique word after cleaning");
                    $scope.BOW = BOW;
                    $scope.BOWReady = true;

                    $scope.featureSelection();
                }
                //gets al comments from all the posts - calls buildBOW
                function getComments(post) {
                    $webServicesFactory.get("https://graph.facebook.com/"+post.id, {}, {
                        fields: "comments.limit("+$scope.commentsLimit+")"+commentsAfter
                    }).then(
                      function (response) {
                          response =  response.comments;
                          $scope.comments = $scope.comments.concat(response.data);

                          if (response.paging.next) {
                              commentsAfter = '.after('+response.paging.cursors.after+')';
                              getComments($scope.posts[$scope.selectedPage+"_"+response.data[0].id.split('_')[0]]);
                          }
                          else{
                              _postsCount += 1;
                              $scope.statue = "Getting comments -This might take a while- " + Math.round(_postsCount/Object.keys($scope.posts).length*100) +"%";
                              if(_postsCount == Object.keys($scope.posts).length){
                                  console.info("Got " + $scope.comments.length + " comments.");
                                  buildBOW();
                              }

                          }
                      }  
                    );
                }
                //chooses features from the bow
                $scope.featureSelection = function () {
                    $scope.statue = "Selecting features.";
                    var features = [];
                    var freqAverage = 0;
                    var freqTotal = 0;
                    //obj to array & average
                    for(var word in $scope.BOW) {
                        features.push({word: word, freq: $scope.BOW[word]});
                        freqTotal += $scope.BOW[word];
                    }
                    freqAverage = freqTotal/features.length;
                    console.info("Found features freq average = "+freqAverage);

                    //order by freq
                    features.sort(
                        function(a,b) {
                            if (a.freq < b.freq)
                                return 1;
                            if (a.freq > b.freq)
                                return -1;
                            return 0;
                        }
                    );
                    //remove what is below average
                    $scope.features = {};
                    for(var i =0; i<features.length; i+=1)
                        if(features[i].freq>freqAverage)
                            $scope.features[features[i].word]=features[i].freq;

                    console.info("Selected "+Object.keys($scope.features).length+" feature.");
                    $scope.doSample();
                };
                //
                $scope.doSample = function () {
                    var commentBOW = {};
                    var commentTxt = "";
                    //filling bow from comments
                    for(var c in $scope.preSample){
                        commentBOW = {};
                        commentTxt = $scope.cleanText($scope.preSample[c].message).split(' ');
                        for(var w=0; w<commentTxt.length; w+=1){
                            if(!$stopWordsProvider[commentTxt[w]]) {
                                if (!commentBOW[commentTxt[w]])
                                    commentBOW[commentTxt[w]] = 0;

                                commentBOW[commentTxt[w]] += 1;
                            }
                        }
                        delete commentBOW[""];


                        $scope.sample[c] = {senti: $scope.preSample[c].sentiment};
                        for(var w in commentBOW){
                            if($scope.sample[c][w])
                                $scope.sample[c][w]+=1;
                            else{
                                if($scope.features[w])
                                    $scope.sample[c][w]=1
                            }
                        }
                    }

                    console.info("Sampled.");
                    $scope.readyToClass = true;
                    $scope.statue = "Ready to class.";
                };


                getPosts().then(
                    function () {
                        filterPosts();
                        for(var post in $scope.posts)
                            getComments($scope.posts[post]);
                    }
                )
            };
            
            $scope.classComment = function (index){
                var commentTxt = $scope.cleanText($scope.comments[index].message).split(' ');

                var commentBOW = {};
                for(var w=0; w<commentTxt.length; w+=1){
                    if(!$stopWordsProvider[commentTxt[w]]) {
                        if (!commentBOW[commentTxt[w]])
                            commentBOW[commentTxt[w]] = 0;

                        commentBOW[commentTxt[w]] += 1;
                    }
                }
                delete commentBOW[""];

                $scope.comments[index].classing = [];

                for(var s in $scope.sample){
                    $scope.comments[index].classing.push({
                        to:s,
                        d:$scope.getDistance(commentBOW, $scope.sample[s]),
                        senti: $scope.sample[s].senti
                    });
                }

                $scope.comments[index].classing.sort(
                    function(a,b) {
                        if (a.d < b.d)
                            return -1;
                        if (a.d > b.d)
                            return 1;
                        return 0;
                    }
                );
                console.log($scope.comments[index]);

            };
            
            $scope.testBOW = function (word) {
                console.log($scope.BOW[word.toLowerCase()]);
            };
            $scope.cleanText = function (str) {
                return str.toLowerCase().replace(/[^a-zA-Z0-9']/gi, ' ').replace(/_/g, ' ').replace(/\r?\n|\r/g, ' ').replace(/ +(?= )/g,'');
            }
            $scope.getDistance = function (A, B) {
                var result = 0;
                for(var a in A){
                    if(B[a])
                        result+= Math.pow((A[a]-B[a]), 2);
                    else
                        result+= Math.pow((A[a]-0), 2);
                }
                for(var b in B){
                    if(!A[b] && b!="senti")
                        result+= Math.pow((0-B[b]), 2);
                }

                return Math.sqrt(result);
            };
        }
    ]
);
/*
* BB>Read id
* C>Improve page crawler
* C>arabic
* C>more calssfiers
* C>spellcheck
* C>Design
* */