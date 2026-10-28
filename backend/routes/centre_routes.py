"""Support Centre Finder routes."""
from flask import Blueprint, request, jsonify
from backend.services.centre_service import SupportCentreService

centre_bp = Blueprint("centres", __name__, url_prefix="/api/centres")


@centre_bp.route("", methods=["GET"])
@centre_bp.route("/", methods=["GET"])
def get_centres():
    """Retrieve autism support centers with geo-coordinates, with optional radius proximity filtering."""
    city = request.args.get("city")
    lat_raw = request.args.get("lat")
    lng_raw = request.args.get("lng")
    radius_raw = request.args.get("radius_km") or request.args.get("radius")

    lat = None
    lng = None
    radius_km = None

    if lat_raw and lng_raw:
        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
        except ValueError:
            pass

    if radius_raw:
        try:
            radius_km = float(radius_raw)
        except ValueError:
            pass

    centres = SupportCentreService.list_centres(
        city=city,
        lat=lat,
        lng=lng,
        max_distance_km=radius_km
    )
    return jsonify({
        "count": len(centres),
        "centres": centres,
        "user_coords": {"latitude": lat, "longitude": lng} if (lat is not None and lng is not None) else None,
        "radius_km": radius_km,
        "map_provider": "Leaflet + OpenStreetMap",
    }), 200
