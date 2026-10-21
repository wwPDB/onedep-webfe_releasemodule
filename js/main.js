/***********************************************************************************************************
File:         main.js
Author:       Zukang Feng
Date:         2013-06-26
Version:      0.0.1

JavaScript supporting Release Module web interface 

2013-06-26, ZF: Created
*************************************************************************************************************/

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////BEGIN: jQuery document ready function ////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// $(document).ajaxStop($.unblockUI);

function display_message(message) {
       alert(message);
}

function run_all_checks(entryId) {
       var sessionId = '';
       $.ajax({ type: 'POST', async: false, url: '/service/validation_tasks_v2/newsession',
            data: '',
            dataType: 'json',
            success: function(jsonObj) {
                if (jsonObj.errorflag) {
                     alert(jsonObj.statustext);
                } else {
                     sessionId = jsonObj.sessionid;
                }
            },
            error: function (data, status, e) {
                alert(e);
            } 
       });
       if (sessionId == '') {
            alert('Open all checks session failed');
            return false;
       }

       var entryFileName = '';
       var entryExpFileName = '';
       var entryCsFileName = '';
       $.ajax({ type: 'POST', async: false, url: '/service/validation_tasks_v2/uploadfromid',
            data: 'sessionid='+sessionId+'&identifier='+entryId,
            dataType: 'json',
            success: function(jsonObj) {
                if (jsonObj.errorflag) {
                     alert(jsonObj.statustext);
                } else {
                     if ("entryfilename" in jsonObj) {
                         entryFileName = jsonObj.entryfilename;
                     }
                     if ("entryexpfilename" in jsonObj) {
                         entryExpFileName = jsonObj.entryexpfilename;
                     }
                     if ("entrycsfilename" in jsonObj) {
                         entryCsFileName = jsonObj.entrycsfilename;
                     }
                }
            },
            error: function (data, status, e) {
                alert(e);
            }
       });
       if (entryFileName == '') {
            alert('Copying data file for entry ' + entryId + ' failed');
            return false;
       }

       var url = '/validation_tasks_v2/wf-check-reports.html?sessionid=' + sessionId + '&entryid=' + entryId + '&entryfilename=' + entryFileName;
       if (entryExpFileName.length > 0) url += '&entryexpfilename=' + entryExpFileName;
       if (entryCsFileName.length > 0) url += '&entrycsfilename=' + entryCsFileName;
       url += '&standalonemode=y&autostartmode=y';
       var myWin = window.open(url);
}

function select_entry(formid, tagid) {
       var request = $('#' + tagid).attr('value');
       $('#' + formid).find('input[name="entry"]').each(function() {
            if (request == 'Select All')
                 $(this).prop('checked', true);
            else $(this).prop('checked', false);
       });
       if (request == 'Select All') {
            $('#' + tagid).attr('value', 'Unselect All');
       } else {
            $('#' + tagid).attr('value', 'Select All');
       }
}

function publicationEntryIds(section) {
       var raw = section.find('.pub-select').attr('data-entry-ids') || '';
       var parts = raw.split(/\s+/);
       var ids = [];
       for (var i = 0; i < parts.length; i++) {
            if (parts[i]) ids.push(parts[i]);
       }
       return ids;
}

function entryCheckbox(structureId) {
       return $('#citation_update input[name="entry"]').filter(function() {
            return this.value === structureId;
       });
}

function entryBlock(structureId) {
       return $('#citation_update tbody.entry-block').filter(function() {
            return $(this).attr('data-entry-id') === structureId;
       });
}

function restoreEntryBlock(block) {
       if (!block || block.length === 0) return;
       var order = parseInt(block.attr('data-entry-order'), 10);
       var table = $('#entry-view');
       var before = null;
       table.children('tbody.entry-block').each(function() {
            var other = parseInt($(this).attr('data-entry-order'), 10);
            if (other > order) {
                 before = this;
                 return false;
            }
       });
       if (before) $(before).before(block);
       else table.append(block);
}

function setPublicationOpen(section, open) {
       var ids = publicationEntryIds(section);
       var i;
       if (open) {
            var slot = section.find('table.pub-entries');
            for (i = 0; i < ids.length; i++) slot.append(entryBlock(ids[i]));
            section.addClass('open');
            section.find('.pub-toggle').val('Collapse').attr('aria-expanded', 'true');
       } else {
            for (i = 0; i < ids.length; i++) restoreEntryBlock(entryBlock(ids[i]));
            section.removeClass('open');
            section.find('.pub-toggle').val('Expand').attr('aria-expanded', 'false');
       }
}

function setPublicationChecked(section, checked) {
       section.find('.pub-select').prop('checked', checked);
       var ids = publicationEntryIds(section);
       for (var i = 0; i < ids.length; i++) entryCheckbox(ids[i]).prop('checked', checked);
}

function select_citation_entries(formid, tagid) {
       var form = $('#' + formid);
       if (form.find('.view-toggle').length === 0) {
            select_entry(formid, tagid);
            return;
       }
       var turnOn = $('#' + tagid).attr('value') == 'Select All';
       if (form.attr('data-view') === 'publication') {
            form.find('#publication-view section.pub:visible').each(function() {
                 setPublicationChecked($(this), turnOn);
            });
       } else {
            form.find('#entry-view tbody.entry-block:visible input[name="entry"]').prop('checked', turnOn);
       }
       $('#' + tagid).attr('value', turnOn ? 'Unselect All' : 'Select All');
}

function setCitationView(name) {
       var form = $('#citation_update');
       if (name !== 'publication') {
            form.find('#publication-view section.pub').each(function() {
                 setPublicationOpen($(this), false);
            });
       }
       form.attr('data-view', name);
       form.find('.view-toggle').each(function() {
            $(this).toggleClass('active', $(this).attr('data-view') === name);
       });
       $('#citation_update_option').prop('disabled', name === 'publication');
       $('#run_citation_update_control').attr('value', 'expand all').val('expand all');
       applyCitationFilter();
}

function applyCitationFilter() {
       var form = $('#citation_update');
       var filter = $('#citation-filter');
       if (filter.length === 0) return;
       var needle = (filter.val() || '').toLowerCase();
       var view = form.attr('data-view') || 'entry';
       var shownEntries = 0;
       var totalEntries = form.find('tbody.entry-block').length;
       form.find('tbody.entry-block').each(function() {
            var hit = view !== 'entry' || !needle || ($(this).attr('data-q') || '').indexOf(needle) !== -1;
            this.style.display = hit ? '' : 'none';
            if (view === 'entry' && hit) shownEntries += 1;
       });
       var shownPubs = 0;
       var totalPubs = form.find('#publication-view section.pub').length;
       form.find('#publication-view section.pub').each(function() {
            var hit = !needle || ($(this).attr('data-q') || '').indexOf(needle) !== -1;
            this.style.display = hit ? '' : 'none';
            if (hit) shownPubs += 1;
       });
       var totalCell = $('#citation-summary-total');
       if (view === 'publication') {
            var pubLabel = needle ? (shownPubs + ' of ' + totalPubs) : String(totalPubs);
            totalCell.text('Total ' + pubLabel + ' publications (' + totalEntries + ' entries)');
            $('#citation-filter-count').text(shownPubs + ' of ' + totalPubs + ' publications');
       } else {
            if (needle) totalCell.text('Total ' + shownEntries + ' of ' + totalEntries + ' entries');
            else totalCell.text('Total ' + totalEntries + ' entries');
            $('#citation-filter-count').text(shownEntries + ' of ' + totalEntries + ' entries');
       }
}

function refreshCitationFinder() {
       applyCitationFilter();
}

function fallbackCopyText(text, done) {
       var area = document.createElement('textarea');
       area.value = text;
       area.style.position = 'fixed';
       area.style.opacity = '0';
       document.body.appendChild(area);
       area.select();
       try { document.execCommand('copy'); done(); } catch (e) { window.prompt('Copy:', text); }
       document.body.removeChild(area);
}

function get_selected_entries(formid) {
       var entries = [];
       $('#' + formid).find('input[name="entry"]').each(function() {
            if ($(this).is(':checked')) {
                 entries.push($(this).attr('value'));
            }
       });
       return entries;
}

function get_selected_value(id) {
       var values = [];
       if ($(id).length > 0) {
            values = [ $(id).val(), $(id + ' :selected').text() ];
       }
       return values;
}

function get_value_options(id) {
       var values = [];
       if ($(id).length > 0) {
            $(id + ' option').each(function() {
                values.push($(this).val());
            });
       }
       return values;
}

function check_release_option(formid, entryid, selectedOptions) {
       var message = '';
       for (var name in selectedOptions) {
            option_values = get_value_options('#' + formid + ' #' + name + entryid);
            if (option_values.length == 0) {
                 message += "No '" + selectedOptions[name][2] + "' release option for entry '" + entryid + "'.\n";
                 continue;
            }
            var idx = option_values.indexOf(selectedOptions[name][0]);
            if (idx < 0) {
                 message += "No allowed '" + selectedOptions[name][1] +"' value in '" + selectedOptions[name][2]
                          + "' release option for entry '" + entryid + "'.\n"; 
            }
       }
       return message;
}

function update_release_option(formid, entryid, selectedOptions) {

       for (var name in selectedOptions) {
            $('#' + formid + ' #' + name + entryid).val(selectedOptions[name][0]);
       }
}

function copy_option_from_first_selected_entry(formid) {
       var entries = get_selected_entries(formid);
       if (entries.length == 0) {
            alert('No entry selected.');
            return;
       }

       var statusType = [ 'status_', 'approval_type_', 'status_sf_', 'status_em_', 'status_mr_', 'status_cs_' ];
       var textualType = [ 'Model File', 'Approval Type', 'SF File', 'EM File', 'MR File', 'CS File' ];

       var found_value = false;
       var selectedOptions = {};
       for (var i = 0; i < statusType.length; i++) {
            var values = get_selected_value('#' + formid + ' #' + statusType[i] + entries[0]);
            if (values.length == 2) {
                 if (values[0] != '') found_value = true;
                 values.push(textualType[i]);
                 selectedOptions[statusType[i]] = values;
            }
       }
       if (!found_value) {
            alert("No release option(s) selected for first selected entry '" + entries[0] + "'.");
            return;
       }

       var message = '';
       for (var i = 1; i < entries.length; i++) { 
            message += check_release_option(formid, entries[i], selectedOptions);
       }
       if (message != '') {
            alert(message);
            return;
       }

       for (var i = 1; i < entries.length; i++) { 
            update_release_option(formid, entries[i], selectedOptions);
       }
}


$(document).ready(function() {       
       var ajaxTimeout = 0;
       $.ajaxSetup({type: "POST",dataType: "json",async: false,timeout: ajaxTimeout,cache: false,global:true});
       $.ajax({url: '/releasemodule/js/jquery.form.min.js', async: false, dataType: 'script'});

       function progressStart() {
            $("#loading").fadeIn('slow').spin("large", "black");
       }

       function progressEnd() {
            $("#loading").fadeOut('fast').spin(false);
       }

       function unSlectExpFiles(entryid) {
            var exptype = [ '#status_sf_', '#status_mr_', '#status_cs_' ];
            for (var i = 0; i < exptype.length; i++) {
                 if ($(exptype[i] + entryid).length > 0) {
                      $(exptype[i] + entryid).attr('checked', false);
                 }
            }
       }

       function updateSlectExpFiles(entryid, r_status) {
            var exptype = [ '#status_sf_', '#status_mr_', '#status_cs_' ];
            for (var i = 0; i < exptype.length; i++) {
                 if ($(exptype[i] + entryid).length > 0) {
                      $(exptype[i] + entryid).val(r_status);
                 }
            }
       }

       function updateRevisionSelection(entryid, r_status) {
            var revisionType = [ '#pdb_revdat_', '#pdbx_revision_' ];
            if ((r_status == 'REREL_modified') || (r_status == 'OBS_obsolete')) {
                 for (var i = 0; i < revisionType.length; i++) {
                      if ($(revisionType[i] + entryid).length > 0) {
                           $(revisionType[i] + entryid).show();
                      }
                 }
            } else if (r_status == 'CITATIONUpdate') {
                 for (var i = 0; i < revisionType.length; i++) {
                      if ($(revisionType[i] + entryid).length > 0) {
                           $(revisionType[i] + entryid).hide();
                      }
                 }
            } else if (r_status == 'RELOAD_reloaded') {
                 if ($('#pdb_revdat_' + entryid).length > 0) {
                      $('#pdb_revdat_' + entryid).hide();
                 }
                 if ($('#pdbx_revision_' + entryid).length > 0) {
                      $('#pdbx_revision_' + entryid).show();
                 }
            }
       }

       function get_wf_selected_entryId() {
            var cur_url = $(location).attr("href").replace('#', '');
            var url_split = cur_url.split('?');
            if ((url_split.length != 2) || (url_split[0].indexOf('/service/release/new_session/wf') == -1)) return '';
            var param_split = url_split[1].split('&');
            for (var i = 0; i < param_split.length; i++) {
                 var t_split = param_split[i].split('=');
                 if ((t_split.length == 2) && (t_split[0] == 'identifier') && (t_split[1] != '')) return t_split[1];
            }
            return '';
       }

       $('.release_status').live("change", function() {
           var id = $(this).attr('id');
           var entryid = id.substring(7)
           var sval = $(this).val(); 
           if ((sval == 'REL_added') || (sval == 'OBS_obsolete')) {
                updateSlectExpFiles(entryid, sval);
           } else if (sval != '') {
                updateSlectExpFiles(entryid, '');
           }
/*
           if ((sval == 'REREL_modified') || (sval == 'RELOAD_reloaded') || (sval == 'CITATIONUpdate') || (sval == 'OBS_obsolete')) {
                updateRevisionSelection(entryid, sval);
           }
*/
           var slist = sval.split('_');
           var status_code = slist[0];
           if ((status_code == 'REL') || (status_code == 'REREL')) {
                $('#span_obsolete_' + entryid).show();
                if ($('#author_obsolete_' + entryid).length > 0) $('#obsolete_' + entryid).val($('#author_obsolete_' + entryid).val());
                $('#span_supersede_' + entryid).hide();
                $('#supersede_' + entryid).val('');
           } else if (status_code == 'OBS') {
                $('#span_obsolete_' + entryid).hide();
                $('#obsolete_' + entryid).val('');
                $('#span_supersede_' + entryid).show();
                if ($('#author_supersede_' + entryid).length > 0) $('#supersede_' + entryid).val($('#author_supersede_' + entryid).val());
                if ($('#author_obspr_details_' + entryid).length > 0) $('#obspr_details_' + entryid).val($('#author_obspr_details_' + entryid).val());
           } else {
                $('#span_obsolete_' + entryid).hide();
                $('#obsolete_' + entryid).val('');
                $('#span_supersede_' + entryid).hide();
                $('#supersede_' + entryid).val('');
                // unSlectExpFiles(entryid);
           }
       });

       $('.list_control').live("click", function() {
            if ($(this).attr('id') === 'run_citation_update_control' && $('#citation_update').attr('data-view') === 'publication') {
                 var expand = $(this).attr('value') === 'expand all';
                 $('#publication-view section.pub').each(function() {
                      if (this.style.display === 'none') return;
                      setPublicationOpen($(this), expand);
                 });
                 $(this).attr('value', expand ? 'collapse all' : 'expand all').val(expand ? 'collapse all' : 'expand all');
                 return;
            }
            var updateList = $(this).attr('name').split(' ');
            var request = $(this).attr('value');
            for (var i = 0; i < updateList.length; i++) {
                 var tag_id = '#' + updateList[i];
                 var style = $(tag_id).next().attr("style");
                 if (((style == 'display: none;') && (request == 'expand all')) || ((style != 'display: none;') && (request == 'collapse all'))) {
                      $(tag_id).next().toggle('fast');
                 }
            }
            if (request == 'collapse all') {
                 $(this).attr('value', 'expand all');
            } else {
                 $(this).attr('value', 'collapse all');
            }
       });

       $('.jshead').live("click", function() {
            var style = $(this).next().attr("style");
            $(this).next().toggle('slow');
            return false;
       });

       $('.submit').click(function() {
              var updateType = $(this).attr('name');
              var task = $(this).attr('value');
              var owner = $('#owner').val();
              if ((owner == 'OTHER') && ((updateType == 'release_onhold') || (updateType == 'release_entry') || (updateType == 'check_marked_pubmed_id') ||
                  (updateType == 'view_release_history') || (updateType == 'view_last_release_info') || (updateType == 'view_all_release_info') ||
                  (updateType == 'expired_onhold') || (updateType == 'auth_rel_status'))) {
                   alert("Task '" + task + "' does not support user 'OTHER'.");
                   return false;
              }
              if ((owner == 'ALL') && ((updateType == 'release_onhold') || (updateType == 'check_marked_pubmed_id') || (updateType == 'view_release_history') ||
                  (updateType == 'view_last_release_info') || (updateType == 'view_all_release_info'))) {
                   alert("Task '" + task + "' does not support user 'ALL'.");
                   return false;
              }

              progressStart();
              var Url;
              var inputdata = 'owner='+owner+'&annotator='+annotator+'&sessionid='+SESSION_ID+'&task='+task;
              if (updateType == 'citation_finder') {
                   Url = '/service/release/citation_finder';
              } else if (updateType == 'citation_update') {
                   var entryId = get_wf_selected_entryId();
                   if (entryId != '') inputdata += '&identifier=' + entryId;
                   Url = '/service/release/citation_update';
              } else if (updateType == 'release_onhold') {
                   Url = '/service/release/release_onhold';
              } else if (updateType == 'expired_onhold') {
                   Url = '/service/release/expired_onhold';
              } else if (updateType == 'auth_rel_status') {
                   Url = '/service/release/auth_rel_status';
              } else if (updateType == 'status_update') {
                   Url = '/service/release/status_update';
              } else if (updateType == 'release_entry') {
                   Url = '/service/release/release_entry';
              } else if (updateType == 'check_marked_pubmed_id') {
                   Url = '/service/release/check_marked_pubmed_id';
              } else if (updateType == 'download_file') {
                   Url = '/service/release/download_file';
                   inputdata += '&ungzip=true';
              } else if (updateType == 'download_logfile') {
                   Url = '/service/release/download_logfile';
              } else if (updateType == 'view_release_history') {
                   Url = '/service/release/view_release_history';
              } else if (updateType == 'view_last_release_info') {
                   Url = '/service/release/view_release_info';
                   inputdata += '&select=last';
              } else if (updateType == 'view_all_release_info') {
                   Url = '/service/release/view_release_info';
                   inputdata += '&select=all';
              }
              $.ajax({ type: 'POST', async: true, url: Url,
                       data: inputdata,
                       dataType: 'json',
                       success: function(jsonOBJ) {
                           progressEnd();
                           if (!jsonOBJ.errorflag) {
                                $('#dt_rslts_combo').html('').hide();
                                $('#dt_rslts_combo').html(''+jsonOBJ.textcontent+'');
                                $('#dt_rslts_combo').show();
                                refreshCitationFinder();
                           } else {
                                alert(jsonOBJ.errortext);
                           }
                       },
                       error: function (data, status, e) {
                           progressEnd();
                           alert(e);
                       } 
              });
       });

       function get_checkbox_checked_list(updateform, checkbox_name) {
              var checkArr = [];
              $(updateform).find('input[name="' + checkbox_name + '"]').each(function() {
                   if ($(this).is(':checked')) {
                        checkArr.push($(this).val());
                   }
              });
              return checkArr
       }

       function validate_update_form(updateform, citation_only_flag) {
              var entryArr = get_checkbox_checked_list(updateform, 'entry');

              if (entryArr.length == 0) {
                   alert('No entry selected');
                   return false;
              }

              var statusType = [ 'status_', 'status_sf_', 'status_em_', 'status_mr_', 'status_cs_' ];
              var message = '';
              var error_flag = false;
              for (var i = 0; i < entryArr.length; ++i) {
                   if (updateform == '#citation_update') {
                        var input_flag = $('#input_flag').val();
                        if (input_flag == 'yes') {
                             var items = [ 'title', 'journal_abbrev', 'journal_volume', 'year', 'page_first', 'page_last', 'pdbx_database_id_PubMed', 'pdbx_database_id_DOI' ];
                             var labels = [ 'Citation Title', 'Journal Abbrev.', 'Journal Volume', 'Year', 'First Page', 'Last Page', 'PubMed ID', 'DOI' ];
                             for (var j = 0; j < items.length; ++j) {
                                  var input_val = $('#' + items[j]).val();
                                  if ( ! (/^[\000-\177]*$/.test(input_val)) ) {
                                       if (!confirm(labels[j] + ': ' + input_val + '\ncontain non-ASCII characters. Do you still want to continue?')) return false;
                                  }
                             }
                        }
                        var found_pubmed = false;
                        var tag_name = 'pubmed_' + entryArr[i]; 
                        $(updateform).find('input[name="' + tag_name + '"]').each(function() {
                             if ($(this).is(':checked')) {
                                  found_pubmed = true;
                             }
                        });
                        if (!found_pubmed && (input_flag != 'yes')) {
                             message += 'Entry ' + entryArr[i] + ' has no pubmed id selected\n\n';
                             error_flag = true;
                        }
                   }

                   var new_status_code = '';
                   if ($('#status_' + entryArr[i]).length > 0) {
                        var select_val = $('#status_' + entryArr[i]).val();
/*
                        if ((citation_only_flag != 'yes') && ((select_val == 'REREL_modified') || (select_val == 'RELOAD_reloaded') || (select_val == 'OBS_obsolete'))) {
                             if ((select_val == 'REREL_modified') || (select_val == 'OBS_obsolete')) {
                                  var revdat = get_checkbox_checked_list(updateform, 'revdat_' + entryArr[i]);
                                  if (revdat.length == 0) {
                                       message += 'Entry ' + entryArr[i] + ' has no REVDAT Record selected\n\n'
                                       error_flag = true;
                                  }
                             }
                             var revision_type = get_checkbox_checked_list(updateform, 'revision_type_' + entryArr[i]);
                             if (revision_type.length == 0) {
                                  message += 'Entry ' + entryArr[i] + ' has no Revision Type selected\n\n'
                                  error_flag = true;
                             }
                        }
*/
                        var list = select_val.split('_');
                        if (list.length == 2) new_status_code = list[0];
                   }
                   if (citation_only_flag != 'yes') {
                        if ((new_status_code == 'REL') && ($('#status_code_' + entryArr[i]).length > 0)) {
                             var status_code = $('#status_code_' + entryArr[i]).attr('value'); 
                             if (status_code != 'REL' && status_code != 'HOLD' && status_code != 'HPUB') {
                                 message += 'Releasing entry ' + entryArr[i] + ' with status code: ' + status_code + '\n\n';
                             }
                        }
                        if ((new_status_code == 'REREL') && ($('#post_release_flag_' + entryArr[i]).length > 0)) {
                             var code = $('#post_release_flag_' + entryArr[i]).attr('value').toUpperCase(); 
                             if (code == 'Y') {
                                 message += 'Releasing entry ' + entryArr[i] + ' with post release coordinate replacement\n\n';
                             }
                        }
                        if (new_status_code == 'OBS') {
                             var new_obsolete_flag = true;
                             if ($('#reobsolete_' + entryArr[i]).length > 0) {
                                  var reobsolete_value = $('#reobsolete_' + entryArr[i]).attr('value');
                                  if (reobsolete_value == 'yes') new_obsolete_flag = false;
                             }
                             if (new_obsolete_flag) {
                                  var supersede_id = '';
                                  if ($('#supersede_' + entryArr[i]).length > 0) supersede_id = $('#supersede_' + entryArr[i]).attr('value');
                                  var obspr_details = '';
                                  if ($('#obspr_details_' + entryArr[i]).length > 0) obspr_details = $('#obspr_details_' + entryArr[i]).attr('value');
                                  if ((supersede_id == '') && (obspr_details == '')) {
                                       message += 'Obsoleting entry ' + entryArr[i] + ' without supersede ID and detail information\n\n';
                                       error_flag = true;
                                  }
                             }
                        }
                   }
                   if (((citation_only_flag != 'yes') && (new_status_code == 'REL')) || (updateform == '#status_update')) {
                        var value = $('#approval_type_' + entryArr[i]).val();
                        if (value == '') {
                             message += 'Entry ' + entryArr[i] + ' has no approval type selected\n\n'
                             error_flag = true;
                        }
                   }
                   var new_release_flag = false;
                   if (($('#new_release_flag_' + entryArr[i]).length > 0) && ($('#new_release_flag_' + entryArr[i]).val() == 'yes')) {
                        new_release_flag = true;
                   }
                   if ((citation_only_flag != 'yes') && ($('#pre_select_flag_' + entryArr[i]).length > 0) && ($('#pre_select_flag_' + entryArr[i]).val() == 'yes')) {
                        var found_diff = false;
                        var skip_flag = false;
                        var curr_select = '';
                        var prev_select = '';
                        for (var j = 0; j < statusType.length; j++) {
                             var curr_val = '';
                             var curr_txt = '';
                             if ($('#' + statusType[j] + entryArr[i]).length > 0) {
                                  curr_val = $('#' + statusType[j] + entryArr[i]).val();
                                  if (curr_val == 'CITATIONUpdate') skip_flag = true;
                                  curr_txt = $('#' + statusType[j] + entryArr[i] + ' :selected').text();
                             }
                             if (curr_val != '') curr_select += '\n' + curr_txt;
                             var prev_val = '';
                             var prev_txt = '';
                             if ($('#pre_select_' + statusType[j] + entryArr[i]).length > 0) {
                                  var val = $('#pre_select_' + statusType[j] + entryArr[i]).val();
                                  var list = val.split(':');
                                  prev_val = list[0];
                                  prev_txt = list[1];
                             }
                             if (prev_val != '') prev_select += '\n' + prev_txt;
                             if (curr_val != prev_val) found_diff = true;
                        }
                        if (!skip_flag && found_diff) {
                             if (new_release_flag) {
                                  // error_flag = true;
                                  message += 'Releasing entry ' + entryArr[i] + ' with release option:' + curr_select + '\n\n';
                                  message += 'Within this release cycle, this deposition was last released with the following option:' + prev_select + '\n\n';
                                  message += 'Releasing with these new options may cause issues in the release process.\n';
                             } else {
                                  message += 'Releasing entry ' + entryArr[i] + ' with release option:' + curr_select + '\n\n';
                                  message += 'Different from previous release option:' + prev_select + '\n\n';
                             }
                        }
                   }
              }

              if (message != '') {
                   if (error_flag) {
                        alert(message);
                        return false;
                   }

                   message += '\nAre you sure you want to continue?';
                   if (!confirm(message)) return false;
              }

              return true;
       }

       $('.run_update').live('click', function() {
              if (($("#previous_doi_value").length > 0) && ($("#keep_citation_checkbox").length > 0) && ($("#keep_citation_checkbox").prop("checked") == false)) {
                   var previous_value = $("#previous_doi_value").attr('value').trim();
                   var current_value = $("#pdbx_database_id_DOI").val().trim();
                   if ((previous_value != "") && (current_value != "")) {
                        var previous = previous_value.toUpperCase();
                        var current = current_value.toUpperCase();
                        if (previous != current) {
                             var text = "The DOI value has been changed from '" + previous_value + "' to '" + current_value 
                                      + "'. Do you want to continue without 'Keep Current Citation' box checked?";
                             if (!window.confirm(text)) return;
                        }
                   }
              }

              var task = $(this).attr('value');

              if ((task == 'Release selected') || (task == 'Update citation & release entries with release mark') || (task == 'Pull selected entries from release')) {
                   var d = new Date();
                   if (((d.getDay() == 4) && (d.getHours() >= 17)) || (d.getDay() == 5)) {
                        if (!window.confirm("It is after cutoff deadline for release. You should not make any release or pull entry(ies) after the deadline! Do you want to continue the release process?")) return;
                   }
              }

              var updateform;
              var citation_only_flag = 'no';
              if (task == 'Update selected') {
                   updateform = '#status_update';
              } else if (task == 'Release selected') {
                   updateform = '#request_release';
              } else if (task == 'Update citation without release') {
                   updateform = '#citation_update';
                   citation_only_flag = 'yes';
              } else if (task == 'Update citation & release entries with release mark') {
                   updateform = '#citation_update';
              } else if (task == 'Pull selected entries from release') {
                   updateform = '#pull_release';
              }

              if (!validate_update_form(updateform, citation_only_flag)) return;

              progressStart();
              $(updateform).ajaxSubmit({url: '/service/release/update', async: true, clearForm: false,
                   beforeSubmit: function (formData, jqForm, options) {
                        formData.push({ 'name' : 'citationflag', 'value' : citation_only_flag });
                   }, success: function(jsonOBJ) {
                       progressEnd();
                       if (!jsonOBJ.errorflag) {
                            $('#dt_rslts_combo').html('').hide();
                            $('#dt_rslts_combo').html('<pre>\n'+jsonOBJ.textcontent+'\n</pre>\n');
                            $('#dt_rslts_combo').show();
                       } else {
                            alert(jsonOBJ.errortext);
                       }
                   }, 
                   error: function (data, status, e) {
                       progressEnd();
                       alert(e);
                   }
              });
       });

       $('.run_removal').live('click', function() {
              var entryArr = [];
              $('#request_removal').find('input[name="combine_id"]').each(function() {
                   if ($(this).is(':checked')) {
                        entryArr.push($(this).val());
                   }
              });

              if (entryArr.length == 0) {
                   alert('No pubmed ID selected');
                   return;
              }

              progressStart();
              $('#request_removal').ajaxSubmit({url: '/service/release/remove_marked_pubmed', async: true, clearForm: false,
                   success: function(jsonOBJ) {
                       progressEnd();
                       if (!jsonOBJ.errorflag) {
                            $('#dt_rslts_combo').html('').hide();
                            $('#dt_rslts_combo').html('<pre>\n'+jsonOBJ.textcontent+'\n</pre>\n');
                            $('#dt_rslts_combo').show();
                       } else {
                            alert(jsonOBJ.errortext);
                       }
                   }, 
                   error: function (data, status, e) {
                       progressEnd();
                       alert(e);
                   }
              });
       });

       $('.run_request').live('click', function() {
              var owner = $('#owner').val();
              var owner_selection = [ '#owner_citation', '#owner_pull', '#owner_request', '#owner_status' ];
              for (var i = 0; i < owner_selection.length; i++) {
                   if ($(owner_selection[i]).length > 0) {
                        $(owner_selection[i]).val(owner);
                   }
              }

              var task = $(this).attr('value');
              var updateform;
              var ual_var;
              if (task == 'Get Citation Info.') {
                   updateform = '#citation_request';
                   ual_var = '/service/release/citation_request';
              } else if (task == 'Input Citation Info.') {
                   updateform = '#citation_request';
                   ual_var = '/service/release/citation_request';
              } else if (task == 'Get Entry Info.') {
                   updateform = '#entry_request';
                   ual_var = '/service/release/entry_request';
              } else if (task == 'Review Marked PubMed ID') {
                   updateform = '#marked_pubmed_request';
                   ual_var = '/service/release/marked_pubmed_request';
              }
              var formData = new FormData($(updateform)[0]);

              $.ajax({ type: 'POST', url: ual_var, async: false, clearForm: false, dataType: 'json',
                   data: formData, cache: false, contentType: false, processData: false,
                   success: function(jsonOBJ) {
                       if (!jsonOBJ.errorflag) {
                            $('#dt_rslts_combo').html('').hide();
                            $('#dt_rslts_combo').html(''+jsonOBJ.textcontent+'');
                            $('#dt_rslts_combo').show();
                            refreshCitationFinder();
                       } else {
                            alert(jsonOBJ.errortext);
                       }
                   }, 
                   error: function (data, status, e) {
                       alert(e);
                   }
              });
       });

       $('.mark_pubmed_id').live('click', function() {
              var list = $(this).attr('id').split(':');
              progressStart();
              $.ajax({ type: 'POST', async: true, url: '/service/release/mark_pubmed_id',
                       data: 'identifier='+list[0]+'&pubmed_id='+list[1]+'&sessionid='+SESSION_ID,
                       dataType: 'json',
                       success: function(jsonOBJ) {
                           progressEnd();
                           if (!jsonOBJ.errorflag) {
                                alert(jsonOBJ.textcontent);
                           } else {
                                alert(jsonOBJ.errortext);
                           }
                       },
                       error: function (data, status, e) {
                           progressEnd();
                           alert(e);
                       } 
              });
       });

       $(document).on('click', '#citation_update .view-toggle', function() {
            setCitationView($(this).attr('data-view'));
       });

       $(document).on('click', '#citation_update .pub-toggle', function() {
            var section = $(this).closest('section.pub');
            setPublicationOpen(section, !section.hasClass('open'));
       });

       $(document).on('change', '#citation_update .pub-select', function() {
            setPublicationChecked($(this).closest('section.pub'), $(this).prop('checked'));
       });

       $(document).on('change', '#citation_update input[name="entry"]', function() {
            var id = this.value;
            $('#publication-view section.pub').each(function() {
                 var ids = publicationEntryIds($(this));
                 var found = false;
                 var i;
                 for (i = 0; i < ids.length; i++) {
                      if (ids[i] === id) found = true;
                 }
                 if (!found) return;
                 var all = true;
                 for (i = 0; i < ids.length; i++) {
                      var box = entryCheckbox(ids[i]);
                      if (box.length === 0 || !box.prop('checked')) all = false;
                 }
                 $(this).find('.pub-select').prop('checked', all);
            });
       });

       $(document).on('click', '#citation_update .pub-unwanted', function() {
            var section = $(this).closest('section.pub');
            var pubmedId = $(this).attr('data-pubmed');
            var ids = publicationEntryIds(section);
            var selected = [];
            for (var i = 0; i < ids.length; i++) {
                 var box = entryCheckbox(ids[i]);
                 if (box.length && box.prop('checked')) selected.push(ids[i]);
            }
            if (selected.length === 0) {
                 alert('No entry selected.');
                 return;
            }
            var index = 0;
            var errors = [];
            function next() {
                 if (index >= selected.length) {
                      $("#loading").fadeOut('fast').spin(false);
                      if (errors.length) alert(errors.join('\n'));
                      else if (selected.length === 1) alert('Mark ' + selected[0] + ' as unwanted.');
                      else alert('Marked ' + selected.length + ' entries as unwanted.');
                      return;
                 }
                 var identifier = selected[index];
                 index += 1;
                 $.ajax({ type: 'POST', async: true, url: '/service/release/mark_pubmed_id',
                      data: 'identifier=' + identifier + '&pubmed_id=' + pubmedId + '&sessionid=' + SESSION_ID,
                      dataType: 'json',
                      success: function(jsonOBJ) {
                           if (jsonOBJ.errorflag) errors.push(jsonOBJ.errortext);
                           next();
                      },
                      error: function (data, status, e) {
                           errors.push(String(e));
                           next();
                      }
                 });
            }
            $("#loading").fadeIn('slow').spin("large", "black");
            next();
       });

       $(document).on('click', '#citation_update .pub-copy', function() {
            var button = $(this);
            var text = button.attr('data-value') || '';
            function done() {
                 var was = button.val();
                 button.val('Copied');
                 setTimeout(function() { button.val(was); }, 1200);
            }
            if (navigator.clipboard && window.isSecureContext) {
                 navigator.clipboard.writeText(text).then(done, function() { fallbackCopyText(text, done); });
            } else {
                 fallbackCopyText(text, done);
            }
       });

       $(document).on('input', '#citation-filter', applyCitationFilter);
       $(document).on('keydown', '#citation-filter', function(event) {
            if (event.which === 13) event.preventDefault();
       });

       refreshCitationFinder();
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////END: jQuery document ready function ////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
