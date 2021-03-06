//-----------------------------------------------------------------------------
// nyacom (C) 2018.05 
// Note: JQuery is required
//-----------------------------------------------------------------------------
var $jq = $.noConflict(true);
$jq(function($){
	//-------------------------------------------------------------------------
	// on document ready
	//-------------------------------------------------------------------------
	$(document).ready(function(){
		get_status();

		// Init
		$('#inp_sw_ports').val(sw_table['ports']);
		$('#inp_sw_slots').val(sw_table['slots']);
		set_swconf_dom();
	});

	//-------------------------------------------------------------------------
	// Reflesh button
	//-------------------------------------------------------------------------
	$('#btn_reflesh').on('click', function(){
		get_status();
	});

	//-------------------------------------------------------------------------
	// FPGA reset button click
	//-------------------------------------------------------------------------
	$('#btn_fpga_reset').on('click', function() {
		if (confirm("FPGA will be initilizing, are you sure?")) {
			$.ajax({
				url         : 'fpga',
				type        : 'delete',
				cache       : false,
				contentType : 'application/json',
				dataType    : 'json'
			})
			.done(function(data, textStatus, jqXHR){
				if (data['return'] == 'success') {
				} else {
					alert(data['error']);
				}
			})
			.fail(function(jqXHR, textStatus, errorThrown){
				alert('AJAX fail');
			});
		}
	});

	//-------------------------------------------------------------------------
	// HLS reset button click
	//-------------------------------------------------------------------------
	$('#btn_hls_reset').on('click', function() {
		if (confirm("Are you sure?")) {
			var json = {
				"command" : "reset",
			}
			$.ajax({
				url         : 'hls',
				type        : 'post',
				data        : JSON.stringify(json),
				cache       : false,
				contentType : 'application/json',
				dataType    : 'json',
				timeout     : 50000
			})
			.done(function(data, textStatus, jqXHR){
				if (data['return'] == 'success') {
				} else {
					alert(data['error']);
				}
			})
			.fail(function(jqXHR, textStatus, errorThrown){
				alert('AJAX fail');
			});
		}
	});

	//-------------------------------------------------------------------------
	// HLS start button click
	//-------------------------------------------------------------------------
	$('#btn_hls_start').on('click', function() {
		if (confirm("Are you sure?")) {
			var json = {
				"command" : "start",
			}
			$.ajax({
				url         : 'hls',
				type        : 'post',
				data        : JSON.stringify(json),
				cache       : false,
				contentType : 'application/json',
				dataType    : 'json',
				timeout     : 50000
			})
			.done(function(data, textStatus, jqXHR){
				//alert(form_data);
			})
			.fail(function(jqXHR, textStatus, errorThrown){
				alert('AJAX fail');
			});
		}
	});

	//-------------------------------------------------------------------------
	// upload button click
	//-------------------------------------------------------------------------
	// FPGA upload form control (for design purpose)
	$('#inp_fpga_upload').on('change', function(){
		$('#inp_fpga_upload_file').val($('#inp_fpga_upload').val());
	});

	$('#btn_fpga_upload').on('click', function() {
		var file = $('#inp_fpga_upload').prop("files")[0];
		var reader = new FileReader();
		reader.readAsDataURL(file);

		// When reader is transfering
		reader.onprogress = function(e) {
			$('#upload_status').text("Transfer:" + e.loaded + " bytes");
		}

		// When data transfer complete
		reader.onload = function(e) {
			$('#upload_status').text("Converting base64...");
			base64_data = reader.result.split(',').pop();

			// Program mode
			var prog_mode = $('input[name=fpga_cfg_mode]:checked').val() 
			var json = {
				"mode": prog_mode,
				"bitname": file.name,
				"bitstream": base64_data,
				"memo" : $('#inp_fpga_memo').val(),
			}

			$('#upload_status').text("Burn FPGA...");
			$('#upload_spinner').css('visibility', 'visible');

			var ajax_timeout = 60000;
			switch (prog_mode) {
				case 'sm16':
				case 'sm16pr':
					ajax_timeout = 60000;	// Approx 60sec
					break;

				case 'sm8':
				case 'sm8pr':
					ajax_timeout = 90000;	// Approx 90sec
					break;
			}

			var to = ajax_timeout / 1000;
			var ts = setInterval(
				function () {
					to -= 1;
					$('#upload_status').text("Burn FPGA... wait " + to + "s...");
				}, 1000
			);

			$.ajax({
				url         : 'fpga',
				type        : 'post',
				data        : JSON.stringify(json),
				cache       : false,
				contentType : 'application/json',
				dataType    : 'json',
				timeout     : ajax_timeout,
			})
			.done(function (form_data, textStatus, jqXHR) {
				clearInterval(ts);
				if (form_data['return'] == 'success') {
					$('#upload_status').text("Successfully Done!");
					$('#upload_spinner').css('visibility', 'hidden');
					get_status();
				} else {
					$('#upload_status').text("Failed!");
					$('#upload_spinner').css('visibility', 'hidden');
				}
			})
			.fail(function (jqXHR, textStatus, errorThrown) {
				//$('#inp_fpga_upload_file').val('');
				clearInterval(ts);
				$('#upload_status').text("Failed! (Ajax Timeout)");
				$('#upload_spinner').css('visibility', 'hidden');
				alert('FPGA configuration failed');
			});
		}
	});

	//-------------------------------------------------------------------------
	// RPi3 command run
	//-------------------------------------------------------------------------
	$('#btn_run_cmd').on('click', function() {
		if (confirm("Are you sure?")) {
			var json = {
				"command": $('#inp_run_cmd').val()
			}
			$.ajax({
				url         : 'runcmd',
				type        : 'post',
				data        : JSON.stringify(json),
				cache       : false,
				contentType : 'application/json',
				dataType    : 'json',
				timeout     : 10000
			})
			.done(function(data, textStatus, jqXHR){
				if (data['return'] == 'success') {
					sout = data['stdout']
					serr = data['stderr']
					$('#txt_cmd_result').val(sout + serr)
				} else {
					$('#txt_cmd_result').val("Command failed")
				}
			})
			.fail(function(jqXHR, textStatus, errorThrown){
				alert('AJAX fail');
			});
		}
	});


	//----------------------------------------------------------------------------
	// Memory read/write
	//----------------------------------------------------------------------------
	// Reg READ Button
	$('#btn_reg_read').on('click', function() {
		// Check input value
		var addr = parseInt($('#inp_reg_addr').val(), 16);
		var has_error = false;

		if (!isFinite(addr)) {
			$('#inp_reg_addr').addClass('inp_val_error');
			has_error = true;
		} else {
			$('#inp_reg_addr').removeClass('inp_val_error');
		}

		if (has_error) {
			return;
		}

		var json = {
			"address" : addr,
		};

		$.ajax({
			url         : 'regread',
			type        : 'post',
			cache       : false,
			contentType : 'application/json',
			dataType    : 'json',
			data        : JSON.stringify(json),
		})
		.done(function(form_data, textStatus, jqXHR){
			console.log(form_data);
			if (form_data['return'] == 'success') {
				$('#inp_reg_val').val(form_data['data'].toString(16));
			} else {
				alert(form_data['error']);
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			alert('AJAX failed');
		});
	});

	// Reg WRITE Button
	$('#btn_reg_write').on('click', function() {
		// Check input value
		var addr = parseInt($('#inp_reg_addr').val(), 16);
		var val = parseInt($('#inp_reg_val').val(), 16);
		var has_error = false;

		if (!isFinite(addr)) {
			$('#inp_reg_addr').addClass('inp_val_error');
			has_error = true;
		} else {
			$('#inp_reg_addr').removeClass('inp_val_error');
		}

		if (!isFinite(val) || val > 0xff) {
			$('#inp_reg_val').addClass('inp_val_error');
			has_error = true;
		} else {
			$('#inp_reg_val').removeClass('inp_val_error');
		}

		if (has_error) {
			return;
		}

		var json = {
			"address" : addr,
			"data" : val,
		};

		$.ajax({
			url         : 'regwrite',
			type        : 'post',
			cache       : false,
			contentType : 'application/json',
			dataType    : 'json',
			data        : JSON.stringify(json),
		})
		.done(function(form_data, textStatus, jqXHR){
			console.log(form_data);
			if (form_data['return'] == 'success') {
			} else {
				alert(form_data['error']);
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			alert('AJAX failed');
		});
	});

	//----------------------------------------------------------------------------
	// obtain board status
	//----------------------------------------------------------------------------
	function get_status() {
		$.ajax({
			url         : 'status',
			type        : 'get',
			cache       : false,
			dataType    : 'json',
			timeout     : 50000
		})
		.done(function(data, textStatus, jqXHR){
			console.log(data);
			//board_led_ctl(data);
			var status = data['status'];

			if (data['return'] == 'success') {

				// Power LED
				if (status['board']['power']) {
					$('#led_power').addClass('led_green_on');
				} else {
					$('#led_power').removeClass('led_green_on');
				}

				// Done LED
				if (status['board']['done']) {
					$('#led_done').addClass('led_green_on');
				} else {
					$('#led_done').removeClass('led_green_on');
				}

				// Board ID
				$('#board_id').text(status['board']['id']);

				// FPGA configuration
				$('#bit_file_name').text(status['fpga']['bitname']);	// bitfilename
				$('#config_time').text(status['fpga']['conftime']);		// configuration time

				// Aurora link
				if (status['board']['link']) {
					$('#led_linkup').addClass('led_green_on');
				} else {
					$('#led_linkup').removeClass('led_green_on');
				}

				// LED0
				if (status['board']['led'] & 0x1) {
					$('#led_0').addClass('led_red_on');
				} else {
					$('#led_0').removeClass('led_red_on');
				}

				// LED1
				if (status['board']['led'] & 0x2) {
					$('#led_1').addClass('led_red_on');
				} else {
					$('#led_1').removeClass('led_red_on');
				}

				// Channel linkup (max 16ch)
				if (status['board']['channel'] != 0x10000) {
					for (var i = 0; i < 16; i++) {
						if (status['board']['channel'] & (0x1 << i)) {
							$('#led_ch' + i).removeClass('led_orange_on');
							$('#led_ch' + i).addClass('led_green_on');
						} else {
							$('#led_ch' + i).removeClass('led_green_on');
							$('#led_ch' + i).addClass('led_orange_on');
						}
					}
				} else {
					for (var i = 0; i < 16; i++) {
						$('#led_ch' + i).removeClass('led_orange_on');
						$('#led_ch' + i).removeClass('led_green_on');
					}
				}

				// Packet counter (max 8 ports)
				for(var i=0; i<8; i++) {
					$('#sw_pcr_in'+i).text(status['board']['pcr']['in'+i]);
					$('#sw_pcr_out'+i).text(status['board']['pcr']['out'+i]);
				}

			} else {
				$('#status_msg').text("get_status failed. FPGA may not configured yet?");		// configuration time
				//alert("get_status failed")
			}

			// config checkboxes
			if (status['config']['auto_reflesh']) {
				$('#chkbox_allow_reflesh').prop('checked', true);
			} else {
				$('#chkbox_allow_reflesh').prop('checked', false);
			}

			if (status['config']['use_gpio']) {
				$('#chkbox_allow_gpio').prop('checked', true);
			} else {
				$('#chkbox_allow_gpio').prop('checked', false);
			}

			var date = new Date()
			$('#status_msg').text("Status at " + date.toUTCString());		// configuration time
			$('#conf_memo').text(status['fpga']['memo']);					// FPGA configuration memo

		})
		.fail(function(jqXHR, textStatus, errorThrown){
			//alert("Ajax Error")
			console.log('ajax error at get_status');
		});
	}

	//----------------------------------------------------------------------------
	// SW configurator
	//----------------------------------------------------------------------------
	$('#inp_sw_ports').on('change', function() {
		var v = parseInt($(this).val());
		if (!isFinite(v) || v < 4) {
			$(this).addClass('inp_val_error');
			return;
		}
		$(this).removeClass('inp_val_error');
		sw_table['ports'] = v;
		set_swconf_dom();
	});

	$('#inp_sw_slots').on('change', function() {
		var v = parseInt($(this).val());
		if (!isFinite(v) || v < 1) {
			$(this).addClass('inp_val_error');
			return;
		}
		$(this).removeClass('inp_val_error');
		sw_table['slots'] = v;
		set_swconf_dom();
	});

	// Tempolary config
	var sw_table = {
		"slots" : 1,
		"ports" : 4,
		"outputs" : {
			"port0" : {
				"slot0" : 0,
			},
			"port1" : {
				"slot0" : 0,
			},
			"port2" : {
				"slot0" : 0,
			},
			"port3" : {
				"slot0" : 0,
			},
		}
	};

	// Render DOM for sw config GUI
	function set_swconf_dom() {
		var ports = sw_table['ports'];
		var slots = sw_table['slots'];

		$('#sw_status').text('');
		$('#sw_conf_table').empty(); // Once empty..

		var p, s;
		// Ports
		for (p = 0; p < ports; p++) {
			var p_id = 'sw_conf_port' + p.toString();
			$('#sw_conf_table').append('<div class="sw_config_port" id=' + p_id + '>');

			$('#' + p_id).append('Port' + p.toString() + ':');
			$('#' + p_id).append('<span class="sw_config_slot">');

			// Slots
			for (s = 0; s < slots; s++) {
				var s_id = 'inp_sw_p' + p + 's' + s; 
				var elem = $('#' + p_id + ' > .sw_config_slot');

				elem.append('Slot' + s.toString() +
					': <input type="text" class="inp_sw_config" id="' + s_id + '"> &nbsp;');
				
				try {
					$('#' + s_id).val(sw_table['outputs']['port'+p]['slot'+s]);
				} catch {
					// Nothing to do
				}
			}
		}
	}

	// Check input and set them to sw_table
	function sw_check_table_input() {
		var ports = sw_table['ports'];
		var slots = sw_table['slots'];

		// Ports
		for (p = 0; p < ports; p++) {
			// Slots
			for (s = 0; s < slots; s++) {
				var elem = $('#inp_sw_p' + p + 's' + s);
				var v = parseInt(elem.val());
				if (!isFinite(v) || v < 0 || v > ports) {
					elem.addClass('inp_val_error');
					return false;
				}
				elem.removeClass('inp_val_error');
			}
		}

		// Set to sw_table
		sw_table['outputs'] = {};
		for (p = 0; p < ports; p++) {
			sw_table['outputs']['port'+p] = {};
			for (s = 0; s < slots; s++) {
				var elem = $('#inp_sw_p' + p + 's' + s);
				var v = parseInt(elem.val());
				sw_table['outputs']['port' + p]['slot' + s] = v;
			}
		}
		console.log(sw_table);

		return true;
	}

	// Perform table set
	$('#sw_set').on('click', function() {
		if (!sw_check_table_input()){
			return;
		}

		$.ajax({
			url         : 'switch',
			type        : 'post',
			cache       : false,
			contentType : 'application/json',
			dataType    : 'json',
			data        : JSON.stringify(sw_table),
		})
		.done(function(form_data, textStatus, jqXHR){
			console.log(form_data);
			if (form_data['return'] == 'success') {
				$('#sw_status').text('Table set done!');
			} else {
				alert(form_data['error']);
				$('#sw_status').text('Table set error!');
			}
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			alert('AJAX failed');
		});

	});

	// Perform table save (download)
	$('#sw_save').on('click', function() {
		if (!sw_check_table_input()) {
			return;
		}

		var blob = new Blob([JSON.stringify(sw_table)], { 'type' : 'application/json' });
		//var blob = new Blob([sw_table], { 'type' : 'text/plain' });
		var url = URL.createObjectURL(blob);
		$(this).attr('href', URL.createObjectURL(blob));
		$(this).attr('target', '_blank');
		$(this).attr('download', 'fic_table.json');
	});

	$('#inp_table_upload').on('change', function(){
		$('#inp_table_upload_file').val($('#inp_table_upload').val());
	});

	$('#btn_table_upload').on('click', function() {
		var file = $('#inp_table_upload').prop("files")[0];
		var reader = new FileReader();
		reader.readAsText(file);

		// When data transfer complete
		reader.onload = function(ev) {
			var json = '';
			try {
				json = JSON.parse(ev.target.result);

			} catch(e) {
				alert("JSON Parse Error: " + e.message);
				return;

			}

			sw_table = json;
			set_swconf_dom();
		}
	});

	//-------------------------------------------------------------------------
	// Checkboxes
	//-------------------------------------------------------------------------
	$('#chkbox_allow_gpio').on('change', function(){
		var json = {
			"use_gpio": $('#chkbox_allow_gpio').prop('checked')
		};
		$.ajax({
			url         : 'config',
			type        : 'post',
			data        : JSON.stringify(json),
			cache       : false,
			contentType : 'application/json',
			dataType    : 'json',
			timeout     : 10000
		})
		.done(function(form_data, textStatus, jqXHR){
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			alert('AJAX failed');
		});
	});

	$('#chkbox_allow_reflesh').on('change', function(){
		var json = {
			"auto_reflesh": $('#chkbox_allow_reflesh').prop('checked')
		};
		$.ajax({
			url         : 'config',
			type        : 'post',
			data        : JSON.stringify(json),
			cache       : false,
			contentType : 'application/json',
			dataType    : 'json',
			timeout     : 10000
		})
		.done(function(form_data, textStatus, jqXHR){
		})
		.fail(function(jqXHR, textStatus, errorThrown){
			alert('AJAX failed');
		});
	});


	//----------------------------------------------------------------------------
	// Every 10s
	//----------------------------------------------------------------------------
	tmr1 = setInterval(function(){
		if ($('#chkbox_allow_reflesh').prop('checked')) {
			get_status();
		}
	}, 10000);
});

