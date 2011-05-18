/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
require(["jquery", "sakai/sakai.api.core"], function($, sakai){

    /**
     * @name sakai_global.carousel
     *
     * @class carousel
     *
     * @description
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.carousel = function(tuid, showSettings){

        /////////////////////////////
        // Configuration variables //
        /////////////////////////////

        // Containers
        var carouselContainer = "#carousel_container";

        // Templates
        var carouselSingleColumnTemplate = "carousel_single_column_template";


        /////////////////////
        // RENDER PREVIEWS //
        /////////////////////

        var renderImagePreview = function(contentURL, lastModified){
            var url = "/p/" + contentURL + "?_=" + lastModified;
            return "<img src=\"" + url + "\" style=\"max-width:350;\"/>";
        };

        var isJwPlayerSupportedVideo = function(mimeType){
            supported = false;
            if (mimeType.substring(0, 6) === "video/") {
                var mimeSuffix = mimeType.substring(6);
                if (mimeSuffix === "x-flv" || mimeSuffix === "mp4" || mimeSuffix === "3gpp" || mimeSuffix === "quicktime") {
                    supported = true;
                }
            }
            return supported;
        };

        var createSWFObject = function(url, params, flashvars){
            if (!url) {
                url = "/devwidgets/video/jwplayer/player-licensed.swf";
            }
            var so = new SWFObject(url, 'ply', '350', '197', '9', '#ffffff');
            so.addParam('allowfullscreen', 'true');
            if (params.allowscriptaccess) {
                so.addParam('allowscriptaccess', params.allowscriptaccess);
            }
            else {
                so.addParam('allowscriptaccess', 'always');
            }
            so.addParam('wmode', 'opaque');
            return so;
        };

        var renderVideoPlayer = function(url){
            var so = createSWFObject(false, {}, {});
            so.addVariable('file', "/p/" + url);
            so.addVariable('stretching', 'uniform');
            so.write("carousel_video");
            return $("#carousel_video_holder").html();
        };


        /////////////////////
        // RENDER CAROUSEL //
        /////////////////////

        var updateViewAfterAnimation = function(carousel, li, index, state){
            if (index > carousel.options.size || index < 1) {
                index = index % carousel.options.size;
                if (!index) {
                    index = carousel.options.size;
                }
                if (index < 1) {
                    index = carousel.options.size + index;
                }
            }
            $("#carousel_container .carousel_view_toggle li").removeClass("carousel_view_toggle_selected");
            $("#carousel_view_toggle_" + carousel.last).removeClass("carousel_view_toggle_selected");
            $("#carousel_view_toggle_" + index).addClass("carousel_view_toggle_selected");

            var contentButtonContainers = [".carousel_three_column_left", ".carousel_three_column_middle", ".carousel_two_high_top", ".carousel_two_high_bottom"];
            $.each(contentButtonContainers, function(index, container) {
                $(container).bind("mouseover", function(){
                    $(container + " .carousel_content_buttons").show();
                });
                $(container).bind("mouseleave", function(){
                    $(container + " .carousel_content_buttons").hide();
                });

            });
        };

        var stopAutoScrolling = function(carousel){
            carousel.startAuto(0);
        };

        var carouselBinding = function(carousel){
            // Pause autoscrolling if the user moves with the cursor over the clip.
            carousel.clip.hover(function(){
                carousel.stopAuto();
            }, function(){
                carousel.startAuto();
            });

            // Disable autoscrolling if the user clicks the prev or next button.
            carousel.buttonNext.bind('click', function(){
                stopAutoScrolling(carousel);
            });

            carousel.buttonPrev.bind('click', function(){
                stopAutoScrolling(carousel);
            });

            $('.carousel_view_toggle li').bind('click', function(){
                stopAutoScrolling(carousel);
                carousel.scroll($.jcarousel.intval($(this)[0].id.split("carousel_view_toggle_")[1]));
                $("#carousel_container .carousel_view_toggle li").removeClass("carousel_view_toggle_selected");
                $(this).addClass("carousel_view_toggle_selected");
                return false;
            });
        };

        var renderCarousel = function(dataArr){
            sakai.api.Util.TemplateRenderer(carouselSingleColumnTemplate, {
                "data": dataArr
            }, $(carouselContainer), false);
            $(carouselContainer).jcarousel({
                auto: 5,
                animation: "slow",
                scroll: 1,
                easing: "swing",
                size: dataArr.length,
                initCallback: carouselBinding,
                wrap: "circular",
                itemFirstInCallback: {
                    onAfterAnimation: updateViewAfterAnimation
                }
            });
        };

        var parseContent = function(data, dataArr){
            var noPreviewArr = [];
            var previewArr = [];
            var numToSuggest = 4;

            $.each(data.content.results, function(index, item) {
                var obj = {};
                var thumbnail = sakai.api.Content.getThumbnail(item);
                var mimeType = sakai.api.Content.getMimeType(item);
                if (mimeType.substring(0, 6) === "image/") {
                    obj.preview = renderImagePreview(item["jcr:name"], item["_lastModified"]);
                }else if (isJwPlayerSupportedVideo(mimeType || "")) {
                    obj.preview = renderVideoPlayer(item["jcr:name"]);
                } else if (thumbnail) {
                    obj.preview = renderImagePreview(item["jcr:name"] + ".page1-small.jpg", item["_lastModified"]);
                } else {
                    obj.preview = false;
                }
                if (item["sakai:description"]) {
                    obj.description = sakai.api.Util.applyThreeDots(item["sakai:description"], 700);
                }
                if (item["sakai:tags"]) {
                    obj.tags = sakai.api.Util.formatTagsExcludeLocation(item["sakai:tags"]);
                }
                if (item[item["jcr:name"] + "/comments"]) {
                    obj.comments = [];
                    for (var prop in item[item["jcr:name"] + "/comments"]) {
                        if (item[item["jcr:name"] + "/comments"][prop].hasOwnProperty("_id")) {
                            obj.comments.push(item[item["jcr:name"] + "/comments"][prop]);
                        }
                    }
                }
                if(sakai.config.MimeTypes[mimeType]) {
                    obj.icon = sakai.config.MimeTypes[mimeType].URL;
                }else{
                    obj.icon = sakai.config.MimeTypes.other.URL;
                }

                obj.title = item["sakai:pooled-content-file-name"];
                obj.mimeType = mimeType || "";
                obj.created = sakai.api.l10n.transformDate(sakai.api.l10n.fromEpoch(item["_created"]), sakai.data.me);
                obj.createdBy = item["sakai:pool-content-created-for"];
                obj.lastModified = sakai.api.l10n.transformDate(sakai.api.l10n.fromEpoch(item["_lastModified"]), sakai.data.me);
                obj.lastModifiedBy = item["_lastModifiedBy"];
                obj.url = "/content#content_path=/p/" + item["jcr:name"];
                obj.contentType = "content";
                obj.id = item["jcr:name"];

                if (obj.preview) {
                    previewArr.push(obj);
                } else {
                    noPreviewArr.push(obj);
                }
            });

            // Prefer items with previews
            var suggested = {
                contentType: "suggestedContent",
                suggestions: previewArr.concat(noPreviewArr)
            };

            dataArr.push(suggested);
        };

        var parseGroups = function(data, dataArr){
            $.each(data.groups.results, function (index, group){
                if (group.members) {
                    var obj = {};

                    if (group.members && group.members.length) {
                        obj.members = group.members;
                    }
                    if (group["sakai:group-description"] && group["sakai:group-description"].length) {
                        obj.description = group["sakai:group-description"];
                    }
                    if (group["sakai:tags"] && group["sakai:tags"].length) {
                        obj.tags = sakai.api.Util.formatTagsExcludeLocation(group["sakai:tags"]);
                    }

                    obj.contentType = "group";
                    obj.groupid = group["sakai:group-id"];
                    obj.title = group["sakai:group-title"];

                    dataArr.push(obj);
                }
            });
        };

        var parseUsers = function(data, dataArr){
            var hasPicAndTag = [];
            var hasPic = [];
            var hasTag = [];
            var noPicAndTag = [];

            $.each(data.users.results, function (index, user){
                var obj = {};

                obj.userid = user.profile.userid;
                obj.contentType = "user";
                obj.displayName = sakai.api.User.getDisplayName(user.profile);

                user = user.profile.basic.elements;
                if (user["sakai:tags"] && user["sakai:tags"].value && user["sakai:tags"].value.length){
                    obj.tags = sakai.api.Util.formatTagsExcludeLocation(user["sakai:tags"].value);
                }
                if (user.aboutme){
                    obj.aboutme = user.aboutme.elements.aboutme.value;
                }
                if (user.picture && user.picture.value && user.picture.value.length){
                    obj.picture = $.parseJSON(user.picture.value);
                }

                if (obj.picture && obj.tags){
                    hasPicAndTag.push(obj);
                } else if (obj.picture) {
                    hasPic.push(obj);
                } else if (obj.tags) {
                    hasTag.push(obj);
                } else {
                    noPicAndTag.push(obj);
                }
            });

            var suggested = {
                contentType: "suggestedUsers",
                suggestions: hasPicAndTag.concat(hasPic, hasTag, noPicAndTag)
            };
            dataArr.push(suggested);
        };

        var parseData = function(data){
            var dataArr = [];

            parseContent(data, dataArr);
            //parseGroups(data, dataArr);
            parseUsers(data, dataArr);
            if (dataArr.length) {
                renderCarousel(dataArr);
            }
        };

        var loadFeatured = function(){
            var dataArr = {
                "content": false,
                "groups": false,
                "users": false
            };

            var reqs = [
                {
                    url: "/var/search/pool/me/related-content.json?items=11",
                    method: "GET",
                    cache: false,
                    dataType: "json"
                },
                {
                    url: "/var/contacts/related-contacts.json?items=11",
                    method: "GET",
                    cache: false,
                    dataType: "json"
                }
            ];

            sakai.api.Server.batch(reqs, function(success, data) {
                if (success) {
                    //content
                    dataArr.content = $.parseJSON(data.results[0].body);
                    //users
                    dataArr.users = $.parseJSON(data.results[1].body);
                }
                parseData(dataArr);
            });

            /*
            $.ajax({
                url: "/var/search/groups-all.json?page=0&items=50&q=*",
                cache: false,
                success: function(data){
                    $.each(data.results, function(index, group) {
                        data.results[group] = data.results[group] || false;
                        if (data.results[group].groupid) {
                            $.ajax({
                                url: "/system/userManager/group/" + data.results[group].groupid + ".members.json?items=50",
                                cache: false,
                                async: false,
                                success: function(memberData){
                                    data.results[group].members = memberData;
                                }
                            });
                        }
                    });
                    dataArr.groups = data;
                    checkDataParsable(dataArr);
                }
            });
            */
        };

        var doInit = function(){
            loadFeatured();
        };

        doInit();
    };

    sakai.api.Widgets.widgetLoader.informOnLoad("carousel");
});
