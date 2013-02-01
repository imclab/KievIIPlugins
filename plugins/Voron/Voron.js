define(['kievII',
        'https://github.com/corbanbrook/dsp.js/raw/master/dsp.js',
        'https://github.com/janesconference/KievII/raw/master/dsp/pitchshift.js',
        'image!'+ require.toUrl('assets/images/Voron_bg2.png'),
        'image!'+ require.toUrl('assets/images/white_big.png')],
        function(k2, dsp, pitchshift, bgImage, kImage) {

  var backgroundImage =  bgImage;
  var knobImage =  kImage;
  var nSamples = 2048;
  var fftFrameSize = 2048;
  shifterStartValue = 0;
  
  var pluginConf = {
      osc: true,
      audioIn: 1,
      audioOut: 1,
      canvas: {
          width: 268,
          height: 340
      },
  }
  var initPlugin = function(args) {
    console.log ("plugin inited, args is", args, "KievII object is ", K2, "bg image is", backgroundImage);
    
    this.name = args.name;
    this.id = args.id;
    
    // The sound part
    this.audioSource = args.audioSources[0];
    this.audioDestination = args.audioDestinations[0];
    this.context = args.audioContext;
    var context = this.context;
    
    this.processorNode = this.context.createJavaScriptNode(nSamples, 1, 1);
    
    this.shifter = new Pitchshift(fftFrameSize, this.context.sampleRate, 'FFT');
    
    this.processorNode.onaudioprocess = function (event) {
        // Get left/right input and output arrays
        var outputArray = [];
        outputArray[0] = event.outputBuffer.getChannelData(0);
        var inputArray = [];
        inputArray[0] = event.inputBuffer.getChannelData(0);
        // console.log ("input is long: ", inputArray[0].length);
        var data = inputArray[0];
        this.shifter.process (this.shiftValue, data.length, 4, data);
        
        var out_data = outputArray[0];
        for (i = 0; i < out_data.length; ++i) {
            out_data[i] = this.shifter.outdata[i];
        }
        
    }.bind(this);
    
    this.audioSource.connect (this.processorNode);
    this.processorNode.connect (this.audioDestination);
    
    // The OSC part
    this.OSChandler = args.OSCHandler;
     
    var oscCallback = function (message) {
       console.log (this.id + " received message: ", message);
       var dest = message[0];
       if (dest === this.id + '/bypass/set/') {
           var bypass = message[1];
           if (bypass === true) {
               //TODO
           }
           else if (bypass === false) {
               //TODO
           }
           else {
               console.error ("Bypass value not known: ", bypass);
           }
        }
    };
    
    this.localClient = this.OSChandler.registerClient ({ clientID : this.id,
                                                      oscCallback : oscCallback.bind (this)
                                                    });
    
     // The graphical part
    this.ui = new K2.UI ({type: 'CANVAS2D', target: args.canvas});
    
    this.viewWidth = args.canvas.width;
    this.viewHeight = args.canvas.height;
	
    /* BACKGROUND INIT */
	
    var bg = new K2.Background({
        ID: 'background',
        image: backgroundImage,
        top: 0,
        left: 0
    });

    this.ui.addElement(bg, {zIndex: 0});
    
    /* KNOB INIT */
   var knobArgs = {
        ID: "pitch_knob",
        left: 87 ,
        top: 176,
        image : knobImage,
        sensitivity : 5000,
        initAngValue: 270,
        startAngValue: 218,
        stopAngValue: 501,
        /* knobMethod: 'updown', */
        onValueSet: function (slot, value) {
            var shift_value = value * (1.5) + 0.5;
            /* shift argument is like a play rate */
            /* We want 0 -> 0.5, 0.5 -> 1, 1 -> 2 */
            /* Let's calculate the semitones */
            var semitoneShift =  K2.MathUtils.linearRange (0, 1, -12, 12, value);
            /* Let's calculate the "play rate" */
            var shift_value = Math.pow(1.0595, semitoneShift);
            this.shiftValue = shift_value;
            console.log ('Shift value set to ', value, this.shiftValue);
            this.ui.refresh();
        }.bind(this),
        isListening: true
    };
    
    this.ui.addElement(new K2.RotKnob(knobArgs));
    this.ui.setValue({elementID: "pitch_knob", value: 0.5});
    this.ui.refresh();
  };
  return {
    initPlugin: initPlugin,
    pluginConf: pluginConf
  };
});