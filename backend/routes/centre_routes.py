"""Support Centre Finder routes."""
from flask import Blueprint, request, jsonify
from backend.services.centre_service import SupportCentreService

centre_bp = Blueprint("centres", __name__, url_prefix="/api/centres")


@centre_bp.route("", methods=["GET"])
@centre_bp.route("/", methods=["GET"])
def get_centres():
    """Retrieve autism support centers with geo-coordinates, proximity filtering, and distance sorting."""
    city = request.args.get("city")
    lat_raw = request.args.get("lat")
    lng_raw = request.args.get("lng")
    radius_raw = request.args.get("radius_km") or request.args.get("radius")
    sort_by = request.args.get("sort_by") or "distance"  # 'distance', 'name', 'city'

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
        max_distance_km=radius_km,
        sort_by=sort_by
    )
    return jsonify({
        "count": len(centres),
        "centres": centres,
        "user_coords": {"latitude": lat, "longitude": lng} if (lat is not None and lng is not None) else None,
        "radius_km": radius_km,
        "sort_by": sort_by,
        "map_provider": "Leaflet + OpenStreetMap",
    }), 200


@centre_bp.route("/top-rated", methods=["GET"])
@centre_bp.route("/recommended", methods=["GET"])
def get_top_rated():
    """Retrieve accredited apex hospital suggestions."""
    lat_raw = request.args.get("lat")
    lng_raw = request.args.get("lng")
    limit_raw = request.args.get("limit") or "5"

    lat = None
    lng = None
    try:
        if lat_raw and lng_raw:
            lat = float(lat_raw)
            lng = float(lng_raw)
    except ValueError:
        pass

    try:
        limit = int(limit_raw)
    except ValueError:
        limit = 5

    suggestions = SupportCentreService.get_top_rated_suggestions(lat=lat, lng=lng, limit=limit)
    return jsonify({
        "count": len(suggestions),
        "suggestions": suggestions,
    }), 200
